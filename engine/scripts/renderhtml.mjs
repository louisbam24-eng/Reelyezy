// node scripts/renderhtml.mjs <page.html> <out.mp4> [--lo|--4k] [--at t1,t2,...]
// Renders a page that exposes window.DURATION and window.seek(t) (the SaleLinx hero-render contract) to MP4,
// with the sound effects in window.SFX ([{at, file, vol}], paths relative to the page) mixed under it.
// --lo: 480x854 at 30fps; --4k: 2160x3840 at 60fps; default 1080x1920 at 60fps. --at writes single frames to <out dir>/frames/ instead.
// --sound-only remixes the sound onto an existing <out>.
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';

const [page_, out] = process.argv.slice(2);
const lo = process.argv.includes('--lo');
const k4 = process.argv.includes('--4k');
const atArg = process.argv.indexOf('--at');
const page = path.resolve(page_);
const RATE = lo ? 30 : 60;

const browser = await chromium.launch({ channel: 'chrome' });
const tab = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: k4 ? 2 : 1 });
tab.on('pageerror', (e) => { console.error(e); process.exit(1); });
await tab.goto(`file://${page}`, { waitUntil: 'networkidle' });
await tab.evaluate(() => document.fonts.ready);

if (atArg > 0) {
  const dir = path.join(path.dirname(path.resolve(out)), 'frames');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of process.argv[atArg + 1].split(',').map(Number)) {
    await tab.evaluate((t) => window.seek(t), t);
    await tab.screenshot({ path: path.join(dir, `${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 90 });
  }
  await browser.close();
  process.exit(0);
}

const dur = await tab.evaluate(() => window.DURATION);
const sfx = await tab.evaluate(() => window.SFX || []);
// --sound-only: keep the picture already in <out> and remix only the sound.
const soundOnly = process.argv.includes('--sound-only');
const silent = `${out}.video.mp4`;
if (soundOnly) fs.renameSync(out, silent);
else {
const enc = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', `${RATE}`, '-i', '-',
  ...(lo ? ['-vf', 'scale=480:854'] : []), '-c:v', 'libx264', '-preset', lo ? 'veryfast' : k4 ? 'medium' : 'slow', '-crf', lo ? '20' : k4 ? '18' : '15',
  '-pix_fmt', 'yuv420p', silent], { stdio: ['pipe', 'inherit', 'inherit'] });
const n = Math.round(dur * RATE);
for (let f = 0; f < n; f++) {
  await tab.evaluate((t) => window.seek(t), f / RATE);
  const buf = await tab.screenshot({ type: 'jpeg', quality: 95 });
  if (!enc.stdin.write(buf)) await once(enc.stdin, 'drain');
  if (f % (RATE * 5) === 0) console.log(`${f}/${n}`);
}
enc.stdin.end();
await once(enc, 'close');
}
await browser.close();

const dir = path.dirname(page);
const ins = sfx.flatMap((s) => ['-i', path.join(dir, s.file)]);
const chains = sfx.map((s, i) => `[${i + 1}:a]aresample=48000,volume=${s.vol},adelay=${Math.round(s.at * 1000)}:all=1[a${i}]`);
const graph = sfx.length
  ? `${chains.join(';')};${sfx.map((_, i) => `[a${i}]`).join('')}amix=inputs=${sfx.length}:normalize=0,apad=whole_dur=${dur},atrim=0:${dur},aresample=192000,alimiter=limit=0.8:level=false,aresample=48000[m]`
  : `anullsrc=r=48000:cl=stereo,atrim=0:${dur}[m]`;
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', silent, ...ins, '-filter_complex', graph,
  '-map', '0:v', '-map', '[m]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-t', `${dur}`, '-movflags', '+faststart', out], { stdio: 'inherit' });
fs.rmSync(silent);
console.log(`built ${out}`);
