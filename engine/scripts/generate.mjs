// node scripts/generate.mjs jobs/<id> [refs|stills|clips|sync]
// Reads <job>/remix/shots.json. refs: character refs. stills: refs + one still per shot. clips: Kling video per animated shot. sync: lip-sync shots marked "sync".
// Every output is a file; existing files are skipped, so delete one to regenerate just that.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

process.loadEnvFile();
const [job, stage = 'stills'] = process.argv.slice(2);
const dir = `${job}/remix`;
const plan = JSON.parse(fs.readFileSync(`${dir}/shots.json`, 'utf8'));
const LOGO = `${process.env.HOME}/Documents/Dev/SaleLinx/Logos/salelinx/transparent/salelinx-lynx-black-512.png`;
const ASPECT = plan.aspect ?? '16:9';
const pad = (n) => String(n).padStart(2, '0');
const MIME = { png: 'image/png', jpg: 'image/jpeg', mp4: 'video/mp4', wav: 'audio/wav', mp3: 'audio/mpeg' };
const dataUri = (f) => `data:${MIME[f.split('.').pop()]};base64,${fs.readFileSync(f).toString('base64')}`;

async function fal(model, input) {
  const headers = { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' };
  const sub = await (await fetch(`https://queue.fal.run/${model}`, { method: 'POST', headers, body: JSON.stringify(input) })).json();
  if (!sub.status_url) throw new Error(`${model}: ${JSON.stringify(sub).slice(0, 300)}`);
  for (;;) {
    const { status } = await (await fetch(sub.status_url, { headers })).json();
    if (status === 'COMPLETED') break;
    if (status !== 'IN_QUEUE' && status !== 'IN_PROGRESS') throw new Error(`${model}: status ${status}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  const res = await (await fetch(sub.response_url, { headers })).json();
  const url = res.images?.[0]?.url ?? res.video?.url;
  if (!url) throw new Error(`${model}: ${JSON.stringify(res).slice(0, 300)}`);
  return Buffer.from(await (await fetch(url)).arrayBuffer());
}

async function make(file, fn) {
  if (fs.existsSync(file)) return;
  fs.mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true });
  try {
    fs.writeFileSync(file, await fn());
    console.log(`made ${file}`);
  } catch (e) {
    console.log(`FAILED ${file}: ${e.message.slice(0, 200)}`);
  }
}

const fill = (s) => s.replaceAll('{cards}', plan.cards);
const animated = (s) => s.video ?? (!!s.motion && !s.glitch);
const refsOnly = stage === 'refs';

if (stage === 'stills' || refsOnly) {
  await Promise.all(Object.entries(plan.characters).map(([name, desc]) => make(`${dir}/refs/${name}.png`, () =>
    fal('fal-ai/nano-banana', { prompt: `${plan.style} Character reference: ${desc}. ${name === 'girls' ? 'All three' : 'Full body'}, front view, relaxed natural expression, plain light background.`, aspect_ratio: '1:1' }))));
}

if (stage === 'stills') {
  await Promise.all(plan.shots.filter((s) => s.image && !s.same_as).map((s) => make(`${dir}/stills/${pad(s.id)}.png`, () => {
    const refs = s.refs.map((r) => `${dir}/refs/${r}.png`).concat(s.logo ? [LOGO] : []);
    const who = s.refs.map((r) => `The ${r} is ${plan.characters[r]} (keep exactly as in the reference image).`).join(' ');
    const prompt = `${plan.style} ${who} ${fill(s.image)}`;
    return refs.length
      ? fal('fal-ai/nano-banana/edit', { prompt, image_urls: refs.map(dataUri), aspect_ratio: ASPECT })
      : fal('fal-ai/nano-banana', { prompt, aspect_ratio: ASPECT });
  })));
  for (const s of plan.shots.filter((s) => s.same_as)) {
    if (!fs.existsSync(`${dir}/stills/${pad(s.id)}.png`)) fs.copyFileSync(`${dir}/stills/${pad(s.same_as)}.png`, `${dir}/stills/${pad(s.id)}.png`);
  }
  await Promise.all(plan.shots.filter((s) => s.end).map((s) => make(`${dir}/stills/${pad(s.id)}-end.png`, () =>
    fal('fal-ai/nano-banana/edit', { prompt: s.end, image_urls: [dataUri(`${dir}/stills/${pad(s.id)}.png`)], aspect_ratio: ASPECT }))));
}

if (stage === 'clips') {
  await Promise.all(plan.shots.filter(animated).map((s) => make(`${dir}/clips/${pad(s.id)}.mp4`, () =>
    fal('fal-ai/kling-video/v2.5-turbo/pro/image-to-video', {
      prompt: `${s.motion} ${plan.clip_style ?? 'Keep the 1990s hand-drawn cel animation style.'}`,
      image_url: dataUri(`${dir}/stills/${pad(s.id)}.png`),
      ...(s.end && { tail_image_url: dataUri(`${dir}/stills/${pad(s.id)}-end.png`) }),
      ...(plan.negative && { negative_prompt: plan.negative }),
      duration: s.len ?? '5',
    }))));
}

// Lip-sync each "sync" shot's trimmed clip to its own lines (run after scripts/voice.mjs).
if (stage === 'sync') {
  const tmp = `${dir}/sync-tmp`;
  fs.mkdirSync(tmp, { recursive: true });
  await Promise.all(plan.shots.filter((s) => s.sync).map((s) => make(`${dir}/clips/${pad(s.id)}-sync.mp4`, () => {
    const id = pad(s.id);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${dir}/clips/${id}.mp4`, '-t', String(s.dur), '-an', '-c:v', 'libx264', '-crf', '16', `${tmp}/${id}.mp4`]);
    const ins = s.lines.flatMap((_, k) => ['-i', `${dir}/audio/line-${id}-${k + 1}.mp3`]);
    const graph = s.lines.map((l, k) => `[${k}:a]adelay=${Math.round(l.at * 1000)}:all=1[a${k}]`).join(';')
      + `;${s.lines.map((_, k) => `[a${k}]`).join('')}amix=inputs=${s.lines.length}:normalize=0,apad,atrim=duration=${s.dur}[out]`;
    execFileSync('ffmpeg', ['-y', '-v', 'error', ...ins, '-filter_complex', graph, '-map', '[out]', '-ar', '44100', `${tmp}/${id}.wav`]);
    return fal('fal-ai/sync-lipsync/v2', { video_url: dataUri(`${tmp}/${id}.mp4`), audio_url: dataUri(`${tmp}/${id}.wav`), sync_mode: 'cut_off' });
  })));
}
