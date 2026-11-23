import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
const dir = process.argv[2] + '/remix', plan = JSON.parse(fs.readFileSync(`${dir}/shots.json`)), out = `${dir}/audio`;
const pad = (n) => String(n).padStart(2, '0'), SC = plan.voice_at_speed ? plan.speed : 1;
const say = (t) => Object.entries(plan.say ?? {}).reduce((s, [a, b]) => s.replaceAll(a, b), t);
const lines = plan.shots.flatMap((s) => (s.lines ?? []).map((l, k) => ({ ...l, name: `line-${pad(s.id)}-${k + 1}` })));
const inputs = lines.map((l) => ({ text: say(l.text), voice_id: plan.voices[l.who] }));
const raw = `${out}/dialogue-raw`;
if (process.argv[3] === '--dry') { inputs.forEach((x, i) => console.log(lines[i].who.padEnd(9), x.text)); console.log(inputs.reduce((s, x) => s + x.text.length, 0), 'chars'); process.exit(); }
if (!fs.existsSync(`${raw}.json`)) {
  const r = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128', {
    method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ inputs, model_id: plan.voice_model ?? 'eleven_v3', settings: plan.voice_settings ?? { stability: 0.5 }, seed: 7 }),
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json();
  fs.writeFileSync(`${raw}.mp3`, Buffer.from(j.audio_base64, 'base64'));
  delete j.audio_base64; fs.writeFileSync(`${raw}.json`, JSON.stringify(j));
}
const j = JSON.parse(fs.readFileSync(`${raw}.json`)), A = j.alignment, total = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', `${raw}.mp3`], { encoding: 'utf8' });
const spans = lines.map((l, i) => {
  const segs = j.voice_segments.filter((s) => s.dialogue_input_index === i);
  if (!segs.length) throw new Error(`no audio for ${l.name}`);
  const c0 = Math.min(...segs.map((s) => s.character_start_index)), c1 = Math.max(...segs.map((s) => s.character_end_index));
  let txt = '', ts = [];
  for (let c = c0; c < c1; c++) { txt += A.characters[c]; ts.push([A.character_start_times_seconds[c], A.character_end_times_seconds[c]]); }
  const words = [];
  let depth = 0;
  [...txt].forEach((ch, k) => {
    if (ch === '[') depth++;
    if (depth || /\s/.test(ch)) { if (ch === ']') depth--; words.at(-1) && (words.at(-1).done = true); return; }
    const w = words.at(-1);
    if (!w || w.done) words.push({ s: ch, start: ts[k][0], end: ts[k][1] });
    else { w.s += ch; w.end = ts[k][1]; }
  });
  return { l, words };
});
// The alignment runs short of the audio, so cut at real pauses: the one nearest each scaled turn boundary.
const k = total / A.character_end_times_seconds.at(-1);
const sil = [...spawnSync('ffmpeg', ['-nostats', '-i', `${raw}.mp3`, '-af', 'silencedetect=n=-42dB:d=0.1', '-f', 'null', '-'], { encoding: 'utf8' }).stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
// Turn gaps are long, so pick the ordered set of pauses that best fits the expected boundaries, favouring long ones.
// Boundaries come from whisper word times on the take (process.argv[3] is its -ml 1 json), matched to the script by LCS.
const norm = (x) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
const WH = JSON.parse(fs.readFileSync(process.argv[3])).transcription.map((x) => ({ w: norm(x.text), t0: x.offsets.from / 1000, t1: x.offsets.to / 1000 })).filter((x) => x.w);
const SW = spans.flatMap((sp, i) => sp.words.map((w) => ({ w: norm(w.s), i })));
const L = Array.from({ length: SW.length + 1 }, () => new Int16Array(WH.length + 1));
for (let a = SW.length - 1; a >= 0; a--) for (let b = WH.length - 1; b >= 0; b--) L[a][b] = SW[a].w === WH[b].w ? L[a + 1][b + 1] + 1 : Math.max(L[a + 1][b], L[a][b + 1]);
const hit = [];
for (let a = 0, b = 0; a < SW.length && b < WH.length;) { if (SW[a].w === WH[b].w) { hit.push({ i: SW[a].i, ...WH[b] }); a++; b++; } else if (L[a + 1][b] >= L[a][b + 1]) a++; else b++; }
let drift = 0;
const E = spans.slice(0, -1).map((sp, i) => {
  const end = hit.filter((h) => h.i === i).at(-1)?.t1, st = hit.find((h) => h.i === i + 1)?.t0, guess = ((sp.words.at(-1).end + spans[i + 1].words[0].start) / 2) * k;
  if (end == null || st == null) return guess + drift;
  drift = (end + st) / 2 - guess; return (end + st) / 2;
});
const cost = (i, n) => Math.abs((sil[n][0] + sil[n][1]) / 2 - E[i]) - 1.5 * Math.min(sil[n][1] - sil[n][0], 0.8);
const dp = E.map(() => sil.map(() => [Infinity, -1]));
E.forEach((_, i) => sil.forEach((_, n) => {
  if (!i) { dp[0][n] = [cost(0, n), -1]; return; }
  for (let m = 0; m < n; m++) if (dp[i - 1][m][0] + cost(i, n) < dp[i][n][0]) dp[i][n] = [dp[i - 1][m][0] + cost(i, n), m];
}));
let n = dp.at(-1).reduce((bi, x, q, arr) => (x[0] < arr[bi][0] ? q : bi), 0);
const gaps = [];
for (let i = E.length - 1; i >= 0; i--) { gaps.unshift(sil[n]); n = dp[i][n][1]; }
const head = sil[0]?.[0] === 0 ? sil[0][1] : 0, tail = sil.at(-1)?.[1] >= total - 0.05 ? sil.at(-1)[0] : total;
spans.forEach((sp, i) => {
  const s0 = i ? gaps[i - 1][1] : head, s1 = i < gaps.length ? gaps[i][0] : tail;
  const t0 = Math.max(0, s0 - 0.04), t1 = Math.min(total, s1 + 0.1);
  const a0 = sp.words[0].start, a1 = sp.words.at(-1).end, map = (t) => s0 + ((t - a0) / (a1 - a0)) * (s1 - s0) - t0;
  const shown = sp.l.text.replace(/\[[^\]]*\]\s*/g, '').split(/\s+/).filter(Boolean);
  const spoken = shown.map((w) => say(w).split(/\s+/).length);
  let k = 0;
  const json = shown.map((w, n) => { const ws = sp.words.slice(k, k + spoken[n]); k += spoken[n]; return { word: w, start: map(ws[0].start) * SC, end: map(ws.at(-1).end) * SC }; });
  if (k !== sp.words.length) console.log('WORD COUNT', sp.l.name, k, sp.words.map((w) => w.s).join(' '));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${raw}.mp3`, '-af', `atrim=${t0.toFixed(3)}:${t1.toFixed(3)},asetpts=N/SR/TB,afade=t=in:d=0.015,areverse,afade=t=in:d=0.04,areverse`, '-c:a', 'libmp3lame', '-q:a', '0', `${out}/${sp.l.name}.mp3`]);
  fs.writeFileSync(`${out}/${sp.l.name}.json`, JSON.stringify(json));
});
console.log(spans.length, 'lines cut from', total.toFixed(1), 's');
