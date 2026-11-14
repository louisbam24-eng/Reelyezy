// node scripts/assemble.mjs jobs/<id> [--lo|--4k] -> <job>/out/video.mp4 (1080x1920), video-lo.mp4 (480x854) from clips-lo, or video-4k.mp4 (2160x3840) from clips-4k.
// Shots play in order, each cut to its "dur": the lip-synced clip if there is one, else the clip (trimmed, or sped up
// with "fit": "speed"), else the still with a push-in. "glitch": N plays shot N's clip on past its cut, glitched.
// "screens" and "end" become animated SaleLinx cards. Spoken lines get word captions.
// Audio: lines, sfx and music from remix/audio (scripts/voice.mjs), ducked under speech; else the source's audio (preview only).
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const job = process.argv[2];
const lo = process.argv.includes('--lo'), uhd = process.argv.includes('--4k');
const K = lo ? 4 / 9 : uhd ? 2 : 1;
const ev = (n) => Math.round((n * K) / 2) * 2;
const [OW, OH] = [ev(1080), ev(1920)];
const clips = `${job}/remix/${lo ? 'clips-lo' : uhd ? 'clips-4k' : 'clips'}`;
const name = lo ? 'video-lo' : uhd ? 'video-4k' : 'video';
const hash = (...a) => createHash('sha1').update(a.join('|')).digest('hex').slice(0, 12);
const dir = `${job}/remix`;
const plan = JSON.parse(fs.readFileSync(`${dir}/shots.json`, 'utf8'));
const { w, h, y } = plan.picture;
const FPS = 30;
const HOME = process.env.HOME;
const FONTS = `${HOME}/Documents/Dev/SaleLinx/Marketing/SaleLinx_Ad_Kit/fonts`;
const LOGO = `${HOME}/Documents/Dev/SaleLinx/Logos/salelinx/tile/salelinx-lynx-tile-512.png`;
const pad = (n) => String(n).padStart(2, '0');
const probe = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
// ElevenLabs takes arrive mastered; a heavier chain flattened them and made the voices sound off.
const VOICE = 'highpass=f=80,equalizer=f=250:t=q:w=1:g=-1.5,deesser=i=0.3,acompressor=threshold=0.125:ratio=2:attack=15:release=200:knee=6';
// Silence is cut before measuring, or short lines with more air around them come out louder.
const loudness = (f, af) => +[...spawnSync('ffmpeg', ['-nostats', '-i', f, '-af', `${af}silenceremove=start_periods=1:start_threshold=-40dB:stop_periods=-1:stop_threshold=-40dB:stop_duration=0.05,ebur128`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)[1];
const cards = `${dir}/${uhd ? 'cards-4k' : 'cards'}`;
fs.mkdirSync(`${job}/out`, { recursive: true });
fs.mkdirSync(cards, { recursive: true });

// Timeline: every shot, screen and the end card in order, with its start time.
const screens = (plan.screens ?? []).map((s, i) => ({ ...s, key: `s${i + 1}`, card: `${cards}/screen-${i + 1}.mp4` }));
const end = plan.end && { ...plan.end, key: 'end', card: `${cards}/end.mp4` };
const items = [...plan.shots.map((s) => ({ ...s, key: pad(s.id) })), ...screens, ...(end ? [end] : [])];
let t = 0;
// trim keeps the partial last frame, so snap to whole frames or the picture drifts behind the voice.
for (const it of items) (it.dur = Math.ceil(it.dur * FPS - 1e-6) / FPS), (it.start = t), (t += it.dur);
const total = t;

// Pages are opened from disk so they can load local fonts and images.
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: uhd ? 2 : 1 });
const font = `@font-face{font-family:Inter;src:url(file://${FONTS}/InterDisplay-ExtraBold.otf)}@font-face{font-family:InterM;src:url(file://${FONTS}/Inter-Medium.otf)}`;
async function open(html, width, height) {
  await page.setViewportSize({ width, height });
  fs.writeFileSync(`${cards}/page.html`, `<style>${font} body{margin:0;width:${width}px;height:${height}px;overflow:hidden}</style>${html}`);
  await page.goto(`file://${path.resolve(cards, 'page.html')}`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
}
async function animate(file, html, dur) {
  const key = hash(html, dur, w, h);
  if (fs.existsSync(`${file}.key`) && fs.readFileSync(`${file}.key`, 'utf8') === key) return;
  await open(html, w, h);
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', file]);
  for (let f = 0; f < Math.round(dur * FPS); f++) {
    await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), (f * 1000) / FPS);
    ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 95 }));
  }
  ff.stdin.end();
  await once(ff, 'close');
  fs.writeFileSync(`${file}.key`, key);
}

for (const s of screens) {
  const k = 984 / s.from[2], H = s.from[3] * k;
  const at = ([x, yy]) => `translate(${-x * k}px,${-yy * k}px)`;
  const cursor = s.click && [(s.click[0] - s.to[0]) * k, (s.click[1] - s.to[1]) * k];
  await animate(s.card, `<style>
    @keyframes pan{0%,15%{transform:${at(s.from)}}70%,100%{transform:${at(s.to)}}}
    @keyframes cur{0%,45%{transform:translate(${cursor?.[0] - 260}px,${cursor?.[1] + 300}px)}78%,100%{transform:translate(${cursor?.[0]}px,${cursor?.[1]}px)}}
    @keyframes ring{0%,80%{opacity:0;transform:scale(.3)}88%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
    @keyframes rise{0%{opacity:0;transform:translateY(30px)}12%,100%{opacity:1;transform:none}}
    *{animation-fill-mode:both;animation-duration:${s.dur}s;animation-timing-function:ease-in-out}</style>
    <div style="height:100%;background:#faf8f3;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:56px">
    <div style="font:62px/1.15 Inter;color:#10100f;text-align:center;padding:0 48px;animation-name:rise"><span style="background:#ffe14d;padding:0 12px;box-decoration-break:clone;-webkit-box-decoration-break:clone">${s.text}</span></div>
    <div style="position:relative;width:984px;height:${H}px;overflow:hidden;border-radius:24px;box-shadow:0 20px 60px rgba(0,0,0,.18)">
      <img src="file://${s.file.replace('~', HOME)}" style="display:block;width:${s.width * k}px;transform-origin:0 0;animation-name:pan">
      ${cursor ? `<div style="position:absolute;left:0;top:0;animation-name:cur">
        <div style="position:absolute;left:-40px;top:-40px;width:80px;height:80px;border-radius:50%;background:rgba(255,225,77,.7);animation-name:ring"></div>
        <svg width="44" height="56" viewBox="0 0 22 28" style="position:absolute"><path d="M1 1v22l6-6 4 9 4-2-4-9h8z" fill="#10100f" stroke="#fff" stroke-width="1.5"/></svg></div>` : ''}
    </div></div>`, s.dur);
}
if (end) {
  await animate(end.card, `<style>
    @keyframes pop{0%{transform:scale(.4);opacity:0}9%{transform:scale(1.08);opacity:1}16%,100%{transform:scale(1)}}
    @keyframes up{0%,6%{opacity:0;transform:translateY(40px)}18%{transform:translateY(-6px)}22%,100%{opacity:1;transform:none}}
    @keyframes up2{0%,13%{opacity:0;transform:translateY(40px)}25%{transform:translateY(-6px)}29%,100%{opacity:1;transform:none}}
    @keyframes up3{0%,20%{opacity:0;transform:scale(.6)}30%{opacity:1;transform:scale(1.1)}36%,100%{opacity:1;transform:none}}
    @keyframes fade{0%,25%{opacity:0}40%,100%{opacity:.75}}
    @keyframes pulse{0%,50%{transform:scale(1)}65%{transform:scale(1.08)}80%,100%{transform:scale(1)}}
    *{animation-fill-mode:both;animation-duration:${end.dur}s;animation-timing-function:ease-out}</style>
    <div style="height:100%;background:${end.light ? '#faf8f3' : 'radial-gradient(ellipse at 50% 40%, #24204a 0%, #0b0b12 70%)'};color:${end.light ? '#10100f' : '#faf8f3'};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <img src="file://${LOGO}" style="width:260px;border-radius:56px;margin-bottom:40px;animation-name:pop;${end.light ? '' : 'box-shadow:0 0 90px rgba(138,92,255,.55)'}">
    <div style="font:110px Inter;letter-spacing:-2px;animation-name:up">SaleLinx</div>
    <div style="font:40px/1.3 InterM;margin:24px 80px 56px;opacity:.85;animation-name:up2">${end.line}</div>
    <div style="animation-name:up3"><div style="font:48px Inter;background:#ffe14d;color:#10100f;padding:20px 44px;border-radius:999px;animation-name:pulse;${end.light ? '' : 'box-shadow:0 0 60px rgba(255,225,77,.35)'}">${end.cta}</div>${end.sub ? `<div style="font:34px InterM;margin-top:22px;opacity:.8">${end.sub}</div>` : ''}</div>${end.light ? '' : '<div style="position:absolute;left:0;right:0;bottom:0;height:6px;background:#a07cff;box-shadow:0 0 40px 10px rgba(138,92,255,.5)"></div>'}
    <div style="font:28px/1.35 InterM;opacity:.75;position:absolute;bottom:${end.small_bottom ?? 380}px;margin:0 80px;animation-name:fade">${end.small}</div></div>`, end.dur);
}

// Captions: up to three words at a time, broken at punctuation, like the original's burnt-in subtitles.
const captions = [];
const cs = { upper: true, y: 0.82, size: 64, stroke: 10, words: 3, chars: 14, ...plan.caption_style };
for (const it of cs.off ? [] : items) {
  for (const [k, l] of (it.lines ?? []).entries()) {
    const words = JSON.parse(fs.readFileSync(`${dir}/audio/line-${it.key}-${k + 1}.json`, 'utf8'));
    const chunks = [];
    for (const wd of words) {
      const last = chunks.at(-1);
      if (last && last.words.length < cs.words && !/[.,?!…]$/.test(last.words.at(-1)) && (last.words.join(' ') + wd.word).length <= cs.chars) last.words.push(wd.word), last.ts.push(wd.start), (last.end = wd.end);
      else chunks.push({ words: [wd.word], ts: [wd.start], start: wd.start, end: wd.end });
    }
    const END = /[.,?!…]$/, WEAK = /^(the|a|an|into|in|to|of|and|on|for|from|with)$/i, CAP = /^[A-Z]/;
    for (let i = chunks.length - 2; i >= 0; i--) {
      const p = chunks[i], q = chunks[i + 1];
      for (;;) {
        const w = p.words.at(-1), fits = (q.words.join(' ') + ' ' + w).length <= cs.chars + 4;
        const orphan = q.words.length === 1 && END.test(q.words[0]), split = CAP.test(w) && CAP.test(q.words[0]) && p.words.length > 1;
        if (p.words.length < 2 || END.test(w) || !(orphan || ((WEAK.test(w) || split) && fits))) break;
        q.words.unshift(p.words.pop()); q.ts.unshift(p.ts.pop()); q.start = q.ts[0];
      }
    }
    for (let i = chunks.length - 2; i >= 0 && cs.words > 1; i--) {
      const p = chunks[i], q = chunks[i + 1];
      if (q.start - p.start < 0.4 && [...p.words, ...q.words].join(' ').length <= cs.chars * 2 + 4) { p.br = p.words.length; p.words.push(...q.words); p.ts.push(...q.ts); p.end = q.end; chunks.splice(i + 1, 1); }
    }
    chunks.forEach((c, i) => {
      const words = cs.upper ? c.words.map((w) => w.toUpperCase()) : c.words, to = chunks[i + 1]?.start ?? c.end + 0.35;
      // Karaoke: one caption per spoken word, with that word boxed.
      for (const [j, at] of (cs.karaoke ? c.ts : [c.start]).entries()) captions.push({
        words, br: c.br, hl: cs.karaoke ? j : -1, cy: it.cap_y ?? cs.y,
        from: it.start + l.at + at,
        to: Math.min(it.start + it.dur, it.start + l.at + (cs.karaoke ? c.ts[j + 1] ?? to : to)),
      });
    });
  }
}
captions.forEach((c, i) => { const n = captions[i + 1]; if (n && n.from < c.to) c.to = n.from; });
// "punch": each card opens two frames larger, so words land instead of appearing.
for (const c of captions) for (const pk of cs.punch ? [1, cs.punch] : [1]) {
  const html = `<div style="position:absolute;top:${y + h * c.cy}px;width:100%;box-sizing:border-box;padding:0 140px;text-wrap:balance;transform:translateY(-50%) scale(${pk});text-align:center;color:#fff;font:${cs.size}px Inter;
    -webkit-text-stroke:${cs.stroke}px #000;paint-order:stroke fill;letter-spacing:1px">${c.words.map((w, j) => {
    const hot = cs.hot?.[w.replace(/[^\w]/g, '')];
    if (j === c.hl) return `<span style="background:${hot ?? '#ffd400'};color:${hot ? '#fff' : '#000'};-webkit-text-stroke:0;border:6px solid #000;border-radius:12px;padding:0 10px">${w}</span>`;
    return (j === c.br ? '<br>' : '') + (hot ? `<span style="color:${hot}">${w}</span>` : w);
  }).join(' ')}</div>`;
  const f = `${cards}/cap-${hash(html)}.png`;
  c[pk === 1 ? 'file' : 'pfile'] = f;
  if (fs.existsSync(f)) continue;
  await open(html, 1080, 1920);
  await page.screenshot({ path: f, omitBackground: true });
}
if (plan.caption) {
  await open(`<div style="position:absolute;top:${y + h / 2}px;width:100%;transform:translateY(-50%);text-align:center;color:#fff;
    font:500 31px 'Helvetica Neue',sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.6)">${plan.caption}</div>`, 1080, 1920);
  await page.screenshot({ path: `${cards}/caption.png`, omitBackground: true });
}
await browser.close();

// Video
const inputs = [];
const input = (...args) => (inputs.push(...args), inputs.filter((a) => a === '-i').length - 1);
const fill = `scale=${ev(w)}:${ev(h)}:force_original_aspect_ratio=increase,crop=${ev(w)}:${ev(h)},setsar=1,fps=${FPS}`;
const graph = items.map((it, i) => {
  const trim = `trim=duration=${it.dur},setpts=PTS-STARTPTS`;
  if (it.card) return `[${input('-i', it.card)}:v]${trim},${fill}[v${i}]`;
  if (it.glitch) {
    const src = plan.shots.find((x) => x.id === it.glitch);
    return `[${input('-ss', String(src.dur), '-i', `${clips}/${pad(it.glitch)}.mp4`)}:v]${trim},${fill},rgbashift=rh=${-ev(24)}:bh=${ev(24)}:gv=${ev(8)},noise=alls=50:allf=t,eq=contrast=1.4:saturation=1.6[v${i}]`;
  }
  const clip = [`${clips}/${it.key}-sync.mp4`, `${clips}/${it.key}.mp4`].find((f) => fs.existsSync(f));
  if (clip) {
    const speed = it.fit === 'speed' ? `setpts=PTS*${it.dur / probe(clip)},` : '';
    return `[${input('-i', clip)}:v]${speed}${trim},${fill}[v${i}]`;
  }
  const frames = Math.round(it.dur * FPS);
  return `[${input('-i', `${dir}/stills/${it.key}.png`)}:v]scale=${w * 2}:-2,zoompan=z='1+0.04*on/${frames}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${frames}:s=${w}x${h}:fps=${FPS},${fill}[v${i}]`;
});
graph.push(`${items.map((_, i) => `[v${i}]`).join('')}concat=n=${items.length}:v=1:a=0,pad=${OW}:${OH}:0:${ev(y)}:black[c0]`);
const on = (f, a, b) => ({ file: f, when: `:enable='between(t,${a.toFixed(3)},${b.toFixed(3)})'` });
const overlays = [...captions.flatMap((c) => (c.pfile ? [on(c.pfile, c.from, c.from + 2 / FPS - 0.001), on(c.file, c.from + 2 / FPS, c.to)] : [on(c.file, c.from, c.to)])),
  ...(plan.caption ? [{ file: `${cards}/caption.png`, when: '' }] : [])];
overlays.forEach((o, i) => graph.push(`[${input('-i', o.file)}:v]scale=${OW}:${OH}[o${i}]`, `[c${i}][o${i}]overlay=0:0${o.when}[c${i + 1}]`));
graph.push(`[c${overlays.length}]format=yuv420p[out]`);

// Audio: every line levelled to the same loudness, effects and music ducked while anyone speaks.
let audio;
const sp = plan.speed ?? 1, AT = plan.voice_at_speed ? sp : 1, len = total / AT;
const lines = items.flatMap((it) => (it.lines ?? []).map((l, k) => ({ file: `${dir}/audio/line-${it.key}-${k + 1}.mp3`, at: (it.start + l.at) / AT, who: l.who, trim: l.trim })));
// "file" reuses another effect; "for" loops it for that many seconds with a fade out, for beds like rain.
const bed = items.flatMap((it) => (it.sfx ?? []).map((s, k) => ({ file: `${dir}/audio/${s.file ?? `sfx-${it.key}-${k + 1}.mp3`}`, at: (it.start + s.at) / AT, vol: s.vol, for: s.for })));
const mixed = lines.length || bed.length;
if (mixed) {
  const place = (x, i, tag, gain) => {
    // v3 ends a file on its last letter, mid-sound, so speech gets short fades or each line ends in a chop.
    const loop = x.for ? `asetpts=N/SR/TB,atrim=duration=${x.for},afade=t=in:d=0.3,afade=t=out:st=${Math.max(0, x.for - 1.5)}:d=1.5,`
      : tag === 'l' ? `afade=t=in:d=0.008,afade=t=out:st=${(probe(x.file) - 0.06).toFixed(3)}:d=0.06,` : '';
    return `[${input(...(x.for ? ['-stream_loop', '-1'] : []), '-i', x.file)}:a]${loop}volume=${gain},adelay=${Math.round(x.at * 1000)}:all=1,asetpts=N/SR/TB[${tag}${i}]`;
  };
  // Each line runs through the voice chain on its own and is matched after it; matched before, lines landed 4 dB apart.
  // voice_trim evens out voices that still read apart, e.g. a bright one the meter rates louder than it sounds.
  lines.forEach((l, i) => {
    const g = -19 - loudness(l.file, ''), trim = (plan.voice_trim?.[l.who] ?? 0) + (l.trim ?? 0);
    graph.push(place(l, i, 'l', `${g.toFixed(1)}dB,${VOICE},volume=${(-19 + trim - loudness(l.file, `volume=${g}dB,${VOICE},`)).toFixed(1)}dB`));
  });
  bed.forEach((b, i) => graph.push(place(b, i, 'b', b.vol)));
  const bedTags = bed.map((_, i) => `[b${i}]`);
  if (plan.music) {
    graph.push(`[${input('-stream_loop', '-1', '-i', `${dir}/audio/music.mp3`)}:a]volume=${plan.music.vol},atrim=duration=${len},afade=t=out:st=${len - 1.5}:d=1.5[m]`);
    bedTags.push('[m]');
  }
  if (!lines.length) graph.push(`${bedTags.join('')}amix=inputs=${bedTags.length}:normalize=0,apad,atrim=duration=${len},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]`);
  else graph.push(`${lines.map((_, i) => `[l${i}]`).join('')}amix=inputs=${lines.length}:normalize=0,apad,atrim=duration=${len},asplit[vox][key]`,
    `${bedTags.join('')}amix=inputs=${bedTags.length}:normalize=0,highshelf=f=7000:g=-2,acompressor=threshold=0.25:ratio=3:attack=2:release=100:knee=4,apad,atrim=duration=${len}[bed]`,
    `[bed][key]sidechaincompress=threshold=0.015:ratio=5:attack=15:release=300:knee=4[duck]`,
    `[vox][duck]amix=inputs=2:normalize=0,aresample=48000[aout]`);
  audio = ['-map', '[aout]'];
} else {
  audio = ['-map', `${input('-i', `${job}/source.mp4`)}:a`];
}

graph.push(`[out]setpts=PTS/${sp}[fast]`);
if (mixed) graph.push(AT === sp ? '[aout]anull[afast]' : `[aout]atempo=${sp / AT}[afast]`), (audio = ['-map', '[afast]']);
execFileSync('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', graph.join(';'), '-map', '[fast]', ...audio,
  '-c:v', 'libx264', '-crf', lo ? '26' : '18', '-preset', lo ? 'veryfast' : 'medium', '-c:a', 'alac', '-t', String(total / sp), '-movflags', '+faststart', `${job}/out/${name}.mp4`], { stdio: 'inherit' });
// One-pass loudnorm lands a couple of dB under on short videos, so the gain is measured, then measured again through the limiter, with the video copied.
const out = `${job}/out/${name}.mp4`;
if (mixed) {
  // One limiter, at 4x rate so it sees the peaks between samples; stacked limiters made the voice grainy.
  const master = (g) => `volume=${g.toFixed(2)}dB,aresample=192000,alimiter=limit=0.7:attack=2:release=80:asc=1:level=false,aresample=48000`;
  const lufs = (af) => +JSON.parse(spawnSync('ffmpeg', ['-nostats', '-i', out, '-af', `${af},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr.match(/\{[\s\S]*\}/)[0]).input_i;
  let g = -13.6 - lufs('anull');
  for (let k = 0; k < 3; k++) g += -13.6 - lufs(master(g));
  const fixed = `${job}/out/.fixed.mp4`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', out, '-c:v', 'copy', '-af', master(g), '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', fixed]);
  fs.renameSync(fixed, out);
}
console.log(`built ${path.join(job, 'out', `${name}.mp4`)} (${(total / sp).toFixed(2)}s, ${captions.length} captions)`);
