// node scripts/find.mjs [hashtag ...] -> jobs/candidates.json, best views-to-followers ratio first.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const DAYS = +(process.env.DAYS ?? 30);
const MAX_FOLLOWERS = +(process.env.MAX_FOLLOWERS ?? 50_000);
const MIN_VIEWS = +(process.env.MIN_VIEWS ?? 100_000);
const MIN_RATIO = +(process.env.MIN_RATIO ?? 10);
const PER_TAG = process.env.PER_TAG ?? '150';
const tags = process.argv.length > 2 ? process.argv.slice(2) : ['smallbusiness', 'marketing', 'viral', 'trending', 'fyp'];

// yt-dlp exits non-zero if any one video fails; the rest of stdout is still good.
const ytdlp = (args) => new Promise((resolve) => execFile('yt-dlp', ['--socket-timeout', '30', '--ignore-errors', ...args],
  { maxBuffer: 1 << 28 }, (_, stdout) => resolve(stdout)));

const urls = new Map();
await Promise.all(tags.map(async (tag) => {
  const { entries = [] } = JSON.parse(await ytdlp(['--flat-playlist', '-J', '--playlist-end', PER_TAG, `https://www.youtube.com/hashtag/${tag}/shorts`]) || '{}');
  const hits = entries.filter((e) => e.view_count >= MIN_VIEWS);
  hits.forEach((e) => urls.set(e.id, e.url));
  console.log(`#${tag}: ${entries.length} shorts, ${hits.length} over ${MIN_VIEWS} views`);
}));

console.log(`fetching details for ${urls.size}...`);
const all = [...urls.values()];
const chunks = Array.from({ length: 8 }, (_, i) => all.filter((_, j) => j % 8 === i)).filter((c) => c.length);
const lines = (await Promise.all(chunks.map((c) => ytdlp(['--skip-download',
  '--print', '%(.{webpage_url,title,channel,view_count,channel_follower_count,upload_date,duration,thumbnail})j', ...c]))))
  .join('\n').split('\n').filter(Boolean);

const out = lines.map((l) => JSON.parse(l))
  .map((d) => ({
    url: d.webpage_url,
    title: d.title,
    channel: d.channel,
    views: d.view_count,
    followers: d.channel_follower_count,
    ratio: Math.round(d.view_count / Math.max(d.channel_follower_count ?? Infinity, 1)),
    age_days: Math.floor((Date.now() - Date.parse(d.upload_date.replace(/(\d{4})(\d\d)(\d\d)/, '$1-$2-$3'))) / 864e5),
    duration: d.duration,
    thumbnail: d.thumbnail,
  }))
  .filter((v) => v.age_days <= DAYS && v.followers < MAX_FOLLOWERS && v.views >= MIN_VIEWS && v.ratio >= MIN_RATIO)
  .sort((a, b) => b.ratio - a.ratio);

fs.mkdirSync('jobs', { recursive: true });
fs.writeFileSync('jobs/candidates.json', JSON.stringify(out, null, 2));

// Contact sheet: YouTube's 3 auto frames per video (25/50/75%). The HTML is the picker; the JPG is for the live-action check.
const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
fs.writeFileSync('jobs/candidates.html', `<!doctype html><meta charset="utf-8"><title>Candidates</title>
<style>body{margin:0;padding:8px;font:13px system-ui;background:#111;color:#eee;display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
a{color:inherit;text-decoration:none;background:#222;padding:4px}b{font-size:22px;color:#ffe14d}img{width:33%;aspect-ratio:9/16;object-fit:cover}
p{margin:2px 0;white-space:nowrap;overflow:hidden}</style>
${out.map((v, i) => {
  const id = new URL(v.url).searchParams.get('v');
  return `<a href="${v.url}" target="_blank"><p><b>${i}</b> ${v.ratio}x · ${v.views.toLocaleString()} / ${v.followers.toLocaleString()} · ${v.age_days}d</p>
${[1, 2, 3].map((k) => `<img src="https://i.ytimg.com/vi/${id}/hq${k}.jpg">`).join('')}<p>${esc(v.title)}</p></a>`;
}).join('\n')}`);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
await page.goto(`file://${path.resolve('jobs/candidates.html')}`, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'jobs/candidates.jpg', fullPage: true, quality: 80 });
await browser.close();

console.table(out.map(({ ratio, views, followers, age_days, title }) => ({ ratio, views, followers, age_days, title: title.slice(0, 50) })));
