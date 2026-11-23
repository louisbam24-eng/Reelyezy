// node scripts/ui.mjs -> http://localhost:5178, a local UI over the pipeline scripts. Claude steps run headless `claude -p`.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const PORT = 5178;
const root = path.resolve('.');
const pad = (n) => String(n).padStart(2, '0');
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const json = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const mtime = (f) => (fs.existsSync(f) ? Math.round(fs.statSync(f).mtimeMs) : 0);
const brands = () => fs.readdirSync('brands').filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3));
const jobIds = () => fs.readdirSync('jobs', { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

const REF = 'jobs/ZN8fajqtK';
const PROMPTS = {
  analyse: (J) => `Write ${J}/breakdown.md: a shot-by-shot breakdown of the original video, so it can be copied detail for detail with the brand swapped. Sources: ${J}/sheets (4x4 frames at 4fps, sheet N covers seconds 4(N-1) to 4N), ${J}/cuts with ${J}/cuts.txt, ${J}/transcript.srt and ${J}/info.json. Cover the hook, every cut and its timing, on-screen text and its style, colour, motion, pacing, sound, and which parts are their brand. Follow the format of ${REF}/breakdown.md.`,
  script: (J, B) => `Write ${J}/script.md: the remix script for the brand in brands/${B}.md, from ${J}/breakdown.md. Same shots and timing, only the brand swapped. Every product claim must come from the brand file; no income claims. Follow the format of ${REF}/script.md.`,
  plan: (J, B) => `Write ${J}/remix/shots.json from ${J}/script.md (brand: brands/${B}.md), in the same shape as ${REF}/remix/shots.json: picture, voices, shots with dur, lines and sfx, screens. Reuse its voice ids.`,
  scene: (J, B) => `Write ${J}/remix/scene.js, animating every shot in ${J}/remix/shots.json with scripts/kit3d.js, following ${REF}/remix/scene.js (brand: brands/${B}.md). Check it with \`node scripts/render3d.mjs ${J} --preview\`, look at ${J}/remix/preview/*.jpg, and fix what is wrong.`,
  fix: (J) => `Compare the draft ${J}/out/video-lo.mp4 with the original ${J}/source.mp4: pull frames from both with ffmpeg and look at them. Fix ${J}/remix/scene.js and shots.json, then re-render with \`node scripts/render3d.mjs ${J} --lo\` and \`node scripts/assemble.mjs ${J} --lo\`. At most 3 rounds. Then write ${J}/out/fix-notes.md listing anything you could not fix. Do not run scripts/voice.mjs.`,
};
const claude = (prompt) => ['claude', ['-p', prompt, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits',
  '--add-dir', `${process.env.HOME}/Documents/Dev/SaleLinx`,
  '--allowedTools', 'Read', 'Glob', 'Grep', 'Bash(node scripts/*)', 'Bash(ffmpeg *)', 'Bash(ffprobe *)']];
const node = (...a) => ['node', a];

// Every runnable step is named here, so the page can never run an arbitrary command.
const STEPS = {
  find: ({ tags }) => [node('scripts/find.mjs', ...(tags.match(/\w+/g) ?? []))],
  download: ({ url }) => [node('scripts/breakdown.mjs', new URL(url).href)],
  analyse: ({ J }) => [claude(PROMPTS.analyse(J))],
  script: ({ J, B }) => [claude(PROMPTS.script(J, B))],
  plan: ({ J, B }) => [claude(PROMPTS.plan(J, B))],
  scene: ({ J, B }) => [claude(PROMPTS.scene(J, B))],
  voice: ({ J }) => [node('scripts/voice.mjs', J)],
  draft: ({ J }) => [node('scripts/render3d.mjs', J, '--lo'), node('scripts/assemble.mjs', J, '--lo')],
  final: ({ J }) => [node('scripts/render3d.mjs', J), node('scripts/assemble.mjs', J)],
  preview: ({ J, shot }) => [node('scripts/render3d.mjs', J, String(shot), '--preview')],
  shotlo: ({ J, shot }) => [node('scripts/render3d.mjs', J, String(shot), '--lo'), node('scripts/assemble.mjs', J, '--lo')],
  fix: ({ J }) => [claude(PROMPTS.fix(J))],
  ask: ({ J, B, text }) => [claude(`Job folder: ${J}. Brand: brands/${B}.md. Reference job: ${REF}.\n\n${text}`)],
};

let run = null;
const clients = new Set();
const emit = (ev, data) => clients.forEach((res) => res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`));
const log = (line) => (run.lines.push(line), emit('line', line));

// Claude's stream-json events, cut to one readable line each.
function claudeLine(raw) {
  let e;
  try { e = JSON.parse(raw); } catch { return raw; }
  if (e.type === 'assistant') return e.message.content.map((c) => c.type === 'text' ? c.text
    : c.type === 'tool_use' ? `→ ${c.name} ${c.input.command ?? c.input.file_path ?? c.input.pattern ?? ''}` : null).filter(Boolean).join('\n') || null;
  if (e.type === 'result') return `done: ${e.subtype}, $${(e.total_cost_usd ?? 0).toFixed(2)}, ${Math.round(e.duration_ms / 1000)}s`;
  return null;
}

async function start(label, job, cmds) {
  run = { label, job, lines: [], done: false, code: null, child: null };
  emit('start', { label, job });
  const env = { ...process.env };
  delete env.CLAUDECODE;
  for (const [cmd, args] of cmds) {
    log(`$ ${cmd} ${cmd === 'claude' ? '-p …' : args.join(' ')}`);
    const child = (run.child = spawn(cmd, args, { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] }));
    let buf = '';
    const onData = (d) => {
      const parts = (buf + d).split(/\r?\n|\r/);
      buf = parts.pop();
      for (const p of parts) { const l = cmd === 'claude' ? claudeLine(p) : p; if (l) log(l); }
    };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    run.code = await new Promise((r) => { child.on('close', r); child.on('error', (e) => (log(String(e)), r(1))); });
    if (buf) log(buf);
    if (run.code !== 0) break;
  }
  run.done = true;
  run.child = null;
  emit('done', { label, code: run.code });
}

function jobState(id) {
  const J = `jobs/${id}`;
  const info = json(`${J}/info.json`) ?? {};
  const audio = fs.existsSync(`${J}/remix/audio`) ? fs.readdirSync(`${J}/remix/audio`).length : 0;
  const previews = Object.fromEntries((fs.existsSync(`${J}/remix/preview`) ? fs.readdirSync(`${J}/remix/preview`) : [])
    .map((f) => [parseInt(f), mtime(`${J}/remix/preview/${f}`)]));
  return {
    id, title: info.title, url: info.webpage_url, views: info.view_count, followers: info.channel_follower_count,
    has: {
      source: mtime(`${J}/source.mp4`), breakdown: mtime(`${J}/breakdown.md`), script: mtime(`${J}/script.md`),
      plan: mtime(`${J}/remix/shots.json`), scene: mtime(`${J}/remix/scene.js`), voice: audio,
      draft: mtime(`${J}/out/video-lo.mp4`), final: mtime(`${J}/out/video.mp4`), fix: mtime(`${J}/out/fix-notes.md`),
    },
    docs: { breakdown: read(`${J}/breakdown.md`), script: read(`${J}/script.md`), fix: read(`${J}/out/fix-notes.md`) },
    plan: json(`${J}/remix/shots.json`), previews,
  };
}

// A changed line needs new audio; voice.mjs only makes files that are missing.
function saveShots(id, next) {
  const f = `jobs/${id}/remix/shots.json`;
  const prev = json(f);
  const old = new Map(prev.shots.map((s) => [s.id, s]));
  for (const s of next.shots) for (const [k, l] of (s.lines ?? []).entries())
    if (old.get(s.id)?.lines?.[k]?.text !== l.text)
      for (const ext of ['mp3', 'json']) fs.rmSync(`jobs/${id}/remix/audio/line-${pad(s.id)}-${k + 1}.${ext}`, { force: true });
  fs.writeFileSync(f, JSON.stringify(next, null, 2) + '\n');
}

const TYPES = { html: 'text/html', mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png', json: 'application/json', md: 'text/plain; charset=utf-8', mp3: 'audio/mpeg' };
function serveFile(req, res, rel) {
  const f = path.resolve(root, rel);
  if (!['jobs', 'brands'].some((d) => f.startsWith(path.join(root, d) + path.sep)) || !fs.existsSync(f)) return send(res, 404, 'not found');
  const size = fs.statSync(f).size, type = TYPES[f.split('.').pop()] ?? 'application/octet-stream';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (!m) return res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' }), fs.createReadStream(f).pipe(res);
  const a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? +m[2] : size - 1;
  res.writeHead(206, { 'Content-Type': type, 'Content-Length': b - a + 1, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(f, { start: a, end: b }).pipe(res);
}

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': typeof body === 'string' ? 'text/plain' : 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
};
const body = async (req) => { let s = ''; for await (const c of req) s += c; return JSON.parse(s || '{}'); };

http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  try {
    if (pathname === '/') return res.writeHead(200, { 'Content-Type': 'text/html' }), fs.createReadStream('scripts/ui.html').pipe(res);
    if (pathname.startsWith('/f/')) return serveFile(req, res, decodeURIComponent(pathname.slice(3)));
    if (pathname === '/api/state') return send(res, 200, {
      candidates: json('jobs/candidates.json') ?? [], brands: brands(),
      jobs: jobIds().map((id) => ({ id, title: json(`jobs/${id}/info.json`)?.title, mtime: mtime(`jobs/${id}`) })).sort((a, b) => b.mtime - a.mtime),
      run: run && { label: run.label, job: run.job, done: run.done, code: run.code },
    });
    const jm = pathname.match(/^\/api\/job\/([\w-]+)$/);
    if (jm && jobIds().includes(jm[1])) {
      if (req.method === 'PUT') return saveShots(jm[1], await body(req)), send(res, 200, { ok: true });
      return send(res, 200, jobState(jm[1]));
    }
    if (pathname === '/api/log') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      if (run) res.write(`event: start\ndata: ${JSON.stringify({ label: run.label, job: run.job, lines: run.lines })}\n\n`);
      if (run?.done) res.write(`event: done\ndata: ${JSON.stringify({ label: run.label, code: run.code })}\n\n`);
      clients.add(res);
      return req.on('close', () => clients.delete(res));
    }
    if (pathname === '/api/stop' && req.method === 'POST') return run?.child?.kill('SIGTERM'), send(res, 200, { ok: true });
    if (pathname === '/api/run' && req.method === 'POST') {
      if (run && !run.done) return send(res, 409, `busy: ${run.label}`);
      const { step, job, brand, shot, tags = '', url = '', text = '' } = await body(req);
      if (!STEPS[step]) return send(res, 400, 'unknown step');
      if (job && !jobIds().includes(job)) return send(res, 400, 'unknown job');
      if (brand && !brands().includes(brand)) return send(res, 400, 'unknown brand');
      if (shot != null && !Number.isInteger(shot)) return send(res, 400, 'bad shot');
      if (step === 'download' && !/^https?:\/\//.test(url)) return send(res, 400, 'bad url');
      const cmds = STEPS[step]({ J: `jobs/${job}`, B: brand, shot, tags, url, text });
      start(shot != null ? `${step} ${shot}` : step, job, cmds);
      return send(res, 200, { ok: true });
    }
    send(res, 404, 'not found');
  } catch (e) { send(res, 500, String(e.message)); }
}).listen(PORT, '127.0.0.1', () => console.log(`http://localhost:${PORT}`));
