// node scripts/breakdown.mjs <url> -> jobs/<id>/: source.mp4, info.json, sheets/ (4x4 frames at 4fps, so sheet N covers seconds 4(N-1) to 4N),
// cuts/ (a frame at each scene cut) with cuts.txt (their times), audio.wav, transcript.srt.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

const url = process.argv[2];
const id = new URL(url).searchParams.get('v') ?? url.split('/').filter(Boolean).pop();
const dir = `jobs/${id}`;
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
const ff = (...args) => run('ffmpeg', ['-y', '-v', 'error', '-i', `${dir}/source.mp4`, ...args]);
for (const d of ['sheets', 'cuts']) fs.rmSync(`${dir}/${d}`, { recursive: true, force: true }), fs.mkdirSync(`${dir}/${d}`, { recursive: true });

run('yt-dlp', ['-f', 'bv*[ext=mp4]+ba[ext=m4a]/b', '--merge-output-format', 'mp4', '-o', `${dir}/source.mp4`, '--force-overwrites', url]);
fs.writeFileSync(`${dir}/info.json`, run('yt-dlp', ['--skip-download', '--print',
  '%(.{webpage_url,title,description,channel,view_count,like_count,comment_count,channel_follower_count,upload_date,duration,width,height,fps,track,artist})j', url]));

// Letterbox bars dilute the scene score and waste the sheets, so crop to the picture first.
const crop = spawnSync('ffmpeg', ['-i', `${dir}/source.mp4`, '-vf', 'cropdetect=round=2', '-f', 'null', '-'], { encoding: 'utf8' })
  .stderr.match(/crop=\d+:\d+:\d+:\d+/g)?.pop() ?? 'null';
ff('-vf', `${crop},fps=4,scale=270:-2,tile=4x4`, `${dir}/sheets/%02d.jpg`);

const { stderr } = spawnSync('ffmpeg', ['-i', `${dir}/source.mp4`, '-vf', `${crop},select='eq(n\\,0)+gt(scene\\,0.3)',showinfo`, '-fps_mode', 'vfr', `${dir}/cuts/%03d.jpg`], { encoding: 'utf8' });
const times = [...stderr.matchAll(/pts_time:([\d.]+)/g)].map((m) => (+m[1]).toFixed(2));
fs.writeFileSync(`${dir}/cuts.txt`, times.map((t, i) => `${String(i + 1).padStart(3, '0')}.jpg ${t}s`).join('\n') + '\n');

ff('-ar', '16000', '-ac', '1', `${dir}/audio.wav`);
run('whisper-cli', ['-m', 'models/ggml-base.bin', '-l', 'auto', '-f', `${dir}/audio.wav`, '-osrt', '-of', `${dir}/transcript`]);

console.log(`${dir}: ${times.length} shots, ${fs.readdirSync(`${dir}/sheets`).length} sheets`);
