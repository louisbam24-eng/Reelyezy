// node scripts/voice.mjs jobs/<id> -> <job>/remix/audio/ from shots.json (ElevenLabs):
// line-<shot>-<n>.mp3 plus .json word timings, sfx-<shot>-<n>.mp3 (screens use s1, s2...), music.mp3.
// Existing files are skipped, so delete one to regenerate just that.
// If shots.json has local_voices, lines come from VoiceStudio on this Mac instead (free); sfx and music stay on ElevenLabs.
// If it has voice_chunks ([[firstShot, lastShot], ...]), each range is one v3 take, split into lines that are fitted to the shots.
// A range is redone only when one of its line files is missing; --split never calls the API.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

process.loadEnvFile();
const job = process.argv[2];
const dir = `${job}/remix/audio`;
const plan = JSON.parse(fs.readFileSync(`${job}/remix/shots.json`, 'utf8'));
const pad = (n) => String(n).padStart(2, '0');
// voice_at_speed: lines are spoken at the film's final speed, so assemble never time-stretches them; timings stay in scene time.
const AT = plan.voice_at_speed ? plan.speed ?? 1 : 1;
const headers = { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' };
fs.mkdirSync(dir, { recursive: true });

async function post(path, body) {
  const r = await fetch(`https://api.elevenlabs.io/v1/${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
  return r;
}

// Words with start/end seconds from the character alignment, skipping [audio tags].
function words({ characters, character_start_times_seconds: s, character_end_times_seconds: e }) {
  const out = [];
  let tag = false, cur = null;
  characters.forEach((c, i) => {
    if (c === '[') tag = true;
    if (tag || /\s/.test(c)) {
      if (cur) out.push(cur), (cur = null);
      if (c === ']') tag = false;
      return;
    }
    cur ? ((cur.word += c), (cur.end = e[i])) : (cur = { word: c, start: s[i], end: e[i] });
  });
  if (cur) out.push(cur);
  return unsay(out);
}

// Captions keep the script's spelling of words respelled in "say".
function unsay(ws) {
  for (const [w, said] of Object.entries(plan.say ?? {})) {
    const n = said.split(' ').length;
    for (let i = 0; i + n <= ws.length; i++) {
      const run = ws.slice(i, i + n), txt = run.map((x) => x.word).join(' ');
      if (txt.startsWith(said)) ws.splice(i, n, { word: w + txt.slice(said.length), start: run[0].start, end: run.at(-1).end });
    }
  }
  return ws;
}

function sound(f, n = -40) {
  const len = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  const log = spawnSync('ffmpeg', ['-nostats', '-i', f, '-af', `silencedetect=n=${n}dB:d=0.05`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const gaps = [...log.matchAll(/silence_start: (-?[\d.]+)(?:[\s\S]*?silence_end: ([\d.]+))?/g)].map((m) => [+m[1], m[2] ? +m[2] : len]);
  return [gaps[0]?.[0] <= 0.01 ? gaps[0][1] : 0, gaps.at(-1)?.[1] >= len - 0.03 ? gaps.at(-1)[0] : len];
}

function speechEnd(f) {
  const len = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  const log = spawnSync('ffmpeg', ['-nostats', '-i', f, '-af', 'silencedetect=n=-35dB:d=0.15', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const tail = [...log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].at(-1);
  return tail && +tail[2] >= len - 0.03 ? +tail[1] + 0.03 : len;
}

// VoiceStudio returns no timings, so whisper.cpp times the words and the script keeps its spelling.
// ElevenLabs reaction tags become the local engine's own; other tags become a spoken direction where the engine takes one.
const REACT = { sighs: '[sigh]', sigh: '[sigh]', laughs: '[laughter]', laughing: '[laughter]', giggles: '[laughter]' };
async function speakLocal(l, file, shot) {
  const text = l.text.replace(/\[[^\]]*\]\s*/g, '').trim();
  const { fallback, ...voice } = plan.local_voices[l.who];
  // Left alone the engine reads about 40% faster than the shots were cut for, so each line fills its shot at a natural pace.
  const duration = l.dur ?? Math.max(0.6, Math.min(shot.dur - l.at - 0.3, text.split(/\s+/).length * (plan.pace ?? 0.45) + 0.4));
  const body = {
    response_format: 'mp3', num_step: 32, duration: duration / AT, ...voice,
    input: Object.entries(plan.say ?? {}).reduce((s, [w, said]) => s.replaceAll(w, said),
      l.text.replace(/\[([^\]]*)\]\s*/g, (_, t) => (REACT[t] ? `${REACT[t]} ` : ''))).trim(),
  };
  const direction = [...l.text.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1]).filter((t) => !REACT[t]).join(', ');
  // OmniVoice only takes voice-design tags; prose there could override the profile's accent.
  if (direction && voice.model && voice.model !== 'omnivoice') body.instructions = direction;
  const words = text.split(/\s+/);
  const ones = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
  const tens = ',,twenty,thirty,forty,fifty,sixty,seventy,eighty,ninety'.split(',');
  const num = (n) => (n < 20 ? ones[n] : n < 100 ? `${tens[Math.floor(n / 10)]} ${n % 10 ? ones[n % 10] : ''}` : String(n));
  // Whisper writes "$2" and "37%", so numbers become words before matching the script.
  const norm = (s) => s.toLowerCase().replace(/\$(\d+)/g, '$1 dollars').replace(/%/g, ' percent').replace(/\d+/g, (d) => ` ${num(+d)} `)
    .replace(/[^a-z' ]/g, ' ').split(/\s+/).filter(Boolean);
  let heard, ok = false;
  // Some takes come back garbled or as noise, so whisper checks each one and a bad take is redone.
  // A voice with a fixed seed keeps it (the seed is the voice) and varies the step count instead.
  // Designed voices fail on some one-word lines; the fallback is a profile cloned from the same voice.
  const takes = voice.seed != null ? [32, 24, 40, 16].map((num_step) => ({ num_step })) : [1, 2, 3, 4, 5, 6, 7, 8].slice(0, l.hear ? 8 : 4).map((seed) => ({ seed }));
  if (fallback) takes.push({ voice: fallback, instruct: undefined, seed: undefined });
  for (const take of takes) {
    if (voice.model === 'say') {
      execFileSync('say', ['-v', voice.voice, '-r', String(voice.rate ?? 185), '-o', `${file}.aiff`, body.input]);
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${file}.aiff`, '-ar', '44100', '-q:a', '2', `${file}.mp3`]);
      fs.rmSync(`${file}.aiff`);
    } else {
      const r = await fetch('http://localhost:3900/v1/audio/speech', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, ...take }),
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
      fs.writeFileSync(`${file}.mp3`, Buffer.from(await r.arrayBuffer()));
    }
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${file}.mp3`, '-ar', '16000', '-ac', '1', `${file}.wav`]);
    execFileSync('whisper-cli', ['-m', 'models/ggml-base.bin', '-l', 'en', '-ml', '1', '-sow', '-np', '-oj', '-f', `${file}.wav`, '-of', `${file}.w`], { stdio: 'ignore' });
    const segs = JSON.parse(fs.readFileSync(`${file}.w.json`, 'utf8')).transcription.filter((s) => /\w/.test(s.text));
    fs.rmSync(`${file}.wav`), fs.rmSync(`${file}.w.json`);
    heard = segs.map((s) => ({ start: s.offsets.from / 1000, end: s.offsets.to / 1000 }));
    const got = new Set(norm(segs.map((s) => s.text).join(' ')));
    const said = norm(body.input.replace(/\[[^\]]*\]/g, ''));
    const hit = said.filter((w) => got.has(w)).length / said.length;
    if ((ok = (l.hear ? new RegExp(l.hear, 'i').test(segs.map((s) => s.text).join('')) : hit >= 0.4) || voice.model === 'say')) break;
    console.log(`  retake ${file} (heard ${Math.round(hit * 100)}%: ${segs.map((s) => s.text).join('').trim()})`);
  }
  if (!ok) throw fs.rmSync(`${file}.mp3`), new Error(`no clean take in ${takes.length} tries`);
  // Whisper stretches short lines over its whole segment (often 2.0s), so the words are rescaled onto the true speech span.
  const stop = speechEnd(`${file}.mp3`), s0 = heard[0]?.start ?? 0, k = Math.min(1, (stop - s0) / ((heard.at(-1)?.end ?? stop) - s0 || 1));
  heard = heard.map((h) => ({ start: s0 + (h.start - s0) * k, end: s0 + (h.end - s0) * k }));
  if (heard.length === words.length) return words.map((word, i) => ({ word, ...heard[i] }));
  // Counts differ ("SaleLinx" heard as two words): spread the script's words over the heard span by length.
  const t0 = heard[0]?.start ?? 0, t1 = heard.at(-1)?.end ?? text.length * 0.07, total = words.join('').length;
  let c = 0;
  return words.map((word) => ({ word, start: t0 + (t1 - t0) * c / total, end: t0 + (t1 - t0) * (c += word.length) / total }));
}

// v3 leaves long comma pauses and trailing air that overrun the shots, so every pause is cut to 0.28s and the timings follow.
function tighten(file) {
  const log = spawnSync('ffmpeg', ['-nostats', '-i', `${file}.mp3`, '-af', 'silencedetect=n=-40dB:d=0.4', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const gaps = [...log.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [+m[1] + 0.14, +m[2] - 0.14]);
  if (!gaps.length) return;
  const keep = `not(${gaps.map(([a, b]) => `between(t,${a},${b})`).join('+')})`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${file}.mp3`, '-af', `aselect='${keep}',asetpts=N/SR/TB`, '-q:a', '2', `${file}.t.mp3`]);
  fs.renameSync(`${file}.t.mp3`, `${file}.mp3`);
  const at = (t) => t - gaps.reduce((s, [a, b]) => s + Math.max(0, Math.min(t, b) - a), 0);
  const w = JSON.parse(fs.readFileSync(`${file}.json`, 'utf8'));
  fs.writeFileSync(`${file}.json`, JSON.stringify(w.map((x) => ({ ...x, start: at(x.start), end: at(x.end) }))));
}

const respell = (t) => Object.entries(plan.say ?? {}).reduce((s, [w, said]) => s.replaceAll(w, said), t);
const cut = (src, from, to, out, fade = 0.04) => execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', from.toFixed(3), '-to', to.toFixed(3), '-i', src, '-af', `afade=t=out:st=${(to - from - fade).toFixed(3)}:d=${fade},aresample=44100`, '-q:a', '2', out]);

// v3 is unstable on short inputs, so whole story sections are voiced in one take and split into lines on the alignment.
// The raw take is saved first, so a split can be redone (delete the range's line files, run with --split) at no cost.
async function chunk([a, b]) {
  const ls = plan.shots.filter((s) => s.id >= a && s.id <= b).flatMap((s) => s.lines.map((l, k) => ({ file: `${dir}/line-${pad(s.id)}-${k + 1}`, text: respell(l.text) })));
  const raw = `${dir}/chunk-${a}-${b}`, text = ls.map((l) => l.text).join(' ');
  if (ls.every((l) => fs.existsSync(`${l.file}.mp3`))) return [];
  if (!fs.existsSync(`${raw}.json`)) {
    if (process.argv.includes('--split')) return [];
    const j = await (await post(`text-to-speech/${plan.voices.narrator}/with-timestamps?output_format=mp3_44100_128`, { text, model_id: plan.voice_model, voice_settings: plan.voice_settings })).json();
    fs.writeFileSync(`${raw}.mp3`, Buffer.from(j.audio_base64, 'base64'));
    fs.writeFileSync(`${raw}.json`, JSON.stringify(j.alignment));
    console.log(`made ${raw}.mp3 (${text.length} chars)`);
  }
  const al = JSON.parse(fs.readFileSync(`${raw}.json`, 'utf8')), S = al.character_start_times_seconds, E = al.character_end_times_seconds;
  if (al.characters.join('') !== text) throw new Error(`${raw}: alignment text differs from the script, split by hand`);
  let o = 0;
  ls.forEach((l, i) => {
    const s0 = o, e0 = o + l.text.length - 1;
    o += l.text.length + 1;
    const f0 = i ? Math.max(S[s0] - 0.05, (E[s0 - 2] + S[s0]) / 2) : Math.max(0, S[s0] - 0.05);
    const t0 = i < ls.length - 1 ? Math.min(E[e0] + 0.15, (E[e0] + S[o]) / 2) : Math.min(E[e0] + 0.15, E.at(-1));
    cut(`${raw}.mp3`, f0, t0, `${l.file}.mp3`);
    // v3 timings run early into pauses, so each line is trimmed to its sound and its words stretched over it.
    // Onset at -35dB skips the breath before a word; v3 stops the take mid-decay, so its last word gets a longer fade.
    const on = sound(`${l.file}.mp3`, -35)[0], off = sound(`${l.file}.mp3`)[1], from = f0 + Math.max(0, on - 0.03), to = Math.min(t0, f0 + off + 0.06);
    cut(`${raw}.mp3`, from, to, `${l.file}.mp3`, i === ls.length - 1 ? 0.12 : 0.04);
    const w = words({ characters: al.characters.slice(s0, e0 + 1), character_start_times_seconds: S.slice(s0, e0 + 1), character_end_times_seconds: E.slice(s0, e0 + 1) });
    const a0 = w[0].start, k = (off - on) / (w.at(-1).end - a0), at = (t) => f0 + on - from + (t - a0) * k;
    fs.writeFileSync(`${l.file}.json`, JSON.stringify(w.map((x) => ({ ...x, start: at(x.start), end: at(x.end) }))));
    tighten(l.file);
  });
  return plan.shots.filter((s) => s.id >= a && s.id <= b && s.lines?.length);
}

// Each line is sped up (to 1.25x at most) to end 0.12s before the next line; past that, the next line or the shot's end moves later.
function fit(s) {
  s.lines.forEach((l, k) => {
    const file = `${dir}/line-${pad(s.id)}-${k + 1}`, w = JSON.parse(fs.readFileSync(`${file}.json`, 'utf8'));
    const next = k + 1 < s.lines.length ? s.lines[k + 1].at : s.dur + 0.05;
    const r = Math.min(1.25, w.at(-1).end / (next - 0.12 - l.at));
    if (r > 1.01) {
      execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${file}.mp3`, '-af', `atempo=${r.toFixed(3)}`, '-q:a', '2', `${file}.t.mp3`]);
      fs.renameSync(`${file}.t.mp3`, `${file}.mp3`);
      fs.writeFileSync(`${file}.json`, JSON.stringify(w.map((x) => ({ ...x, start: x.start / r, end: x.end / r }))));
    }
    const end = l.at + w.at(-1).end / Math.max(1, r);
    if (k + 1 < s.lines.length && end + 0.12 > next + 0.005) console.log(`  shot ${s.id} line ${k + 2} at ${next} -> ${(s.lines[k + 1].at = +(end + 0.12).toFixed(2))}`);
    if (k + 1 === s.lines.length && end + 0.07 > s.dur + 0.005) console.log(`  shot ${s.id} dur ${s.dur} -> ${(s.dur = +(end + 0.07).toFixed(2))}`);
    console.log(`  ${s.id}-${k + 1} x${Math.max(1, r).toFixed(2)}`);
  });
}

if (plan.voice_chunks) {
  for (const c of plan.voice_chunks) {
    (await chunk(c)).forEach(fit);
    fs.writeFileSync(`${job}/remix/shots.json`, JSON.stringify(plan, null, 2));
  }
  process.exit();
}

const items = [...plan.shots.map((s) => ({ key: pad(s.id), ...s })), ...(plan.screens ?? []).map((s, i) => ({ key: `s${i + 1}`, ...s })), ...(plan.end ? [{ ...plan.end, key: 'end' }] : [])];
// Free plan allows 2 concurrent requests, so one at a time.
for (const it of items) {
  for (const [k, l] of (it.lines ?? []).entries()) {
    const file = `${dir}/line-${it.key}-${k + 1}`;
    if (fs.existsSync(`${file}.mp3`)) { if (!plan.local_voices) tighten(file); continue; }
    try {
      if (plan.local_voices) {
        fs.writeFileSync(`${file}.json`, JSON.stringify((await speakLocal(l, file, it)).map((w) => ({ ...w, start: w.start * AT, end: w.end * AT }))));
        console.log(`made ${file}.mp3 (local)`);
        continue;
      }
      const j = await (await post(`text-to-speech/${plan.voices[l.who]}/with-timestamps?output_format=mp3_44100_128`, { text: Object.entries(plan.say ?? {}).reduce((s, [w, said]) => s.replaceAll(w, said), l.text), model_id: plan.voice_model ?? 'eleven_v3', voice_settings: plan.voice_settings })).json();
      fs.writeFileSync(`${file}.mp3`, Buffer.from(j.audio_base64, 'base64'));
      fs.writeFileSync(`${file}.json`, JSON.stringify(words(j.alignment)));
      tighten(file);
      console.log(`made ${file}.mp3`);
    } catch (e) { console.log(`FAILED ${file}: ${e.message}`); }
  }
  for (const [k, s] of (it.sfx ?? []).entries()) {
    const file = `${dir}/sfx-${it.key}-${k + 1}.mp3`;
    if (s.file || fs.existsSync(file)) continue;
    try {
      fs.writeFileSync(file, Buffer.from(await (await post('sound-generation', { text: s.prompt, duration_seconds: Math.max(0.5, s.dur), prompt_influence: 0.5 })).arrayBuffer()));
      console.log(`made ${file}`);
    } catch (e) { console.log(`FAILED ${file}: ${e.message}`); }
  }
}
if (plan.music && !fs.existsSync(`${dir}/music.mp3`)) {
  fs.writeFileSync(`${dir}/music.mp3`, Buffer.from(await (await post('sound-generation', { text: plan.music.prompt, duration_seconds: plan.music.dur, prompt_influence: 0.5 })).arrayBuffer()));
}
