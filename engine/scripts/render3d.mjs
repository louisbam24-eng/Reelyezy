// node scripts/render3d.mjs jobs/<id> [shot ids...] [--preview]
// Renders each animated shot from <job>/remix/scene.js (Three.js, headless Chrome on the GPU) to remix/clips/NN.mp4.
// --preview writes three frames per shot side by side to remix/preview/NN.jpg instead.
// --lo renders at 480p to remix/clips-lo for fast edits (assemble.mjs --lo); --4k renders 2160x3840 to remix/clips-4k.
// Mouths follow the loudness of each shot's lines in remix/audio (scripts/voice.mjs). Each shot also gets its start time and plan.overlay.
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const args = process.argv.slice(2);
const job = args[0];
const preview = args.includes('--preview');
const lo = args.includes('--lo'), uhd = args.includes('--4k');
const only = args.slice(1).filter((a) => /^\d+$/.test(a)).map(Number);
const dir = path.resolve(job, 'remix');
const plan = JSON.parse(fs.readFileSync(`${dir}/shots.json`, 'utf8'));
const k = lo ? 4 / 9 : uhd ? 2 : 1;
const w = Math.round(plan.picture.w * k / 2) * 2, h = Math.round(plan.picture.h * k / 2) * 2;
// --clean renders without the text overlay, for hand-off to an editor.
const clean = args.includes('--clean');
const clips = `${dir}/${clean ? 'clips-clean' : lo ? 'clips-lo' : uhd ? 'clips-4k' : 'clips'}`;
const FPS = 30;
const pad = (n) => String(n).padStart(2, '0');
const root = path.resolve('.');
const HOME = process.env.HOME;
const b64 = (f) => fs.readFileSync(f).toString('base64');

function envelope(file) {
  const raw = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'], { maxBuffer: 1 << 28 }).stdout;
  const s = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length));
  const n = 44100 / FPS, out = [];
  for (let i = 0; i < s.length; i += n) {
    let e = 0;
    const end = Math.min(s.length, Math.floor(i + n));
    for (let k = Math.floor(i); k < end; k++) e += s[k] * s[k];
    out.push(Math.sqrt(e / Math.max(1, end - Math.floor(i))));
  }
  const top = [...out].sort((a, b) => a - b)[Math.floor(out.length * 0.9)] || 1;
  return out.map((v) => Math.min(1, v / top));
}

const types = { '.js': 'text/javascript', '.html': 'text/html', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(new URL(q.url, 'http://x').pathname));
  if (!f.startsWith(root) || !fs.existsSync(f)) return r.writeHead(404).end();
  r.writeHead(200, { 'Content-Type': types[path.extname(f)] ?? 'application/octet-stream' });
  fs.createReadStream(f).pipe(r);
}).listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
const scene = path.relative(root, `${dir}/scene.js`);
const FONTS = `${HOME}/Documents/Dev/SaleLinx/Marketing/SaleLinx_Ad_Kit/fonts`;
const page_ = path.join(dir, 'render.html');
fs.writeFileSync(page_, `<!doctype html><style>body{margin:0;background:#000}
@font-face{font-family:Inter;src:url(data:font/otf;base64,${b64(`${FONTS}/InterDisplay-ExtraBold.otf`)})}
@font-face{font-family:InterM;src:url(data:font/otf;base64,${b64(`${FONTS}/Inter-Medium.otf`)})}</style>
<canvas id=c width=${w} height=${h}></canvas>
<script type=importmap>{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type=module>
await document.fonts.load('80px Inter'); await document.fonts.load('80px InterM');
const logo = new Image(); logo.src = 'data:image/png;base64,${b64(`${HOME}/Documents/Dev/SaleLinx/Logos/salelinx/transparent/salelinx-lynx-black-512.png`)}'; await logo.decode();
window.assets = { logo };
window.scene = await import('/${scene}');
window.ready = true;
</script>`);

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: w, height: h } });
page.on('console', (m) => m.type() === 'error' && console.log('page:', m.text()));
page.on('pageerror', (e) => console.log('page error:', e.message));
await page.goto(`${base}/${path.relative(root, page_)}`);
await page.waitForFunction(() => window.ready, null, { timeout: 60000 });

const starts = {};
// "src" is the length a shot is rendered at when assemble speeds it up to fit a shorter "dur".
const len = (s) => s.src ?? s.dur;
plan.shots.reduce((t, s) => ((starts[s.id] = t), t + len(s)), 0);
const glitchOf = Object.fromEntries(plan.shots.filter((s) => s.glitch).map((s) => [s.glitch, s.dur]));
fs.mkdirSync(clips, { recursive: true });
fs.mkdirSync(`${dir}/preview`, { recursive: true });
for (const s of plan.shots.filter((s) => !s.glitch && (!only.length || only.includes(s.id)))) {
  const id = pad(s.id);
  const lines = (s.lines ?? []).map((l, k) => ({ who: l.who, at: l.at, env: envelope(`${dir}/audio/line-${id}-${k + 1}.mp3`) }));
  const dur = len(s) + (glitchOf[s.id] ?? 0);
  const t0 = Date.now();
  await page.evaluate(([id, data]) => window.scene.setup(id, data), [s.id, { dur, lines, start: starts[s.id], overlay: clean ? {} : plan.overlay }]);
  const frame = async (t) => Buffer.from((await page.evaluate((t) => window.scene.frame(t), t)).split(',')[1], 'base64');
  if (preview) {
    const files = [];
    for (const [k, f] of [0.1, 0.5, 0.9].entries()) fs.writeFileSync((files[k] = `${dir}/preview/${id}-${k}.jpg`), await frame(len(s) * f));
    spawnSync('ffmpeg', ['-y', '-v', 'error', ...files.flatMap((f) => ['-i', f]), '-filter_complex', 'hstack=3,scale=1080:-2', `${dir}/preview/${id}.jpg`]);
    files.forEach((f) => fs.rmSync(f));
  } else {
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', lo ? '23' : '15', `${clips}/${id}.mp4`]);
    for (let f = 0; f < Math.ceil(dur * FPS); f++) if (!ff.stdin.write(await frame(f / FPS))) await once(ff.stdin, 'drain');
    ff.stdin.end();
    await once(ff, 'close');
  }
  console.log(`shot ${id} ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
await browser.close();
server.close();
