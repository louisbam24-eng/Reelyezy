# Reelyezy — V1

A social media marketing hub: set up your brand, find trending videos, turn them into posts, and schedule them.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

To make a version for hosting: `npm run build` (the files land in `dist/`).

## What works in V1

| Screen | What it does |
| --- | --- |
| **Home** | Discover → Create → Schedule buttons, this week's numbers, what's scheduled next |
| **My brand** | Website box, about you, problems you solve, key messages, voice. Saves. |
| **Trends** | Trending videos with views, likes, shares and growth. Filter by platform. "Remake this" |
| **New post** | Start from your idea (text, link or upload) or a trend, then pick the content type |
| **Create** | 3 versions to pick from, a different editor per content type, nudge buttons, phone preview, pick platforms and a time |
| **Schedule** | Week and month views, drag posts between days, drafts tray, "Fill my week for me" |

Content types: Photos & carousels (slides), Animation (scenes), AI influencer (presenter, voice, script), Real creator / UGC (brief, shot list, creator progress).

## What's fake for now

Everything is saved in the browser (no server yet). Use **Load sample data** / **Start fresh** at the bottom of the menu.

| Fake part | Where to swap in the real thing |
| --- | --- |
| AI writing (hooks, captions, scripts) | `src/lib/generate.ts`: replace `writePost`, `nudgeVersion` and `readWebsite`. Nothing else needs to change. |
| Trending videos and the week's numbers | `src/lib/mockData.ts` (`TRENDS`, `WEEK_STATS`, `BEST_TIMES`) |
| Saving data | `src/lib/store.tsx`: keep the `useStore()` shape, change how it loads and saves |
| Posting to Instagram, TikTok and LinkedIn | Not built yet. Scheduled posts sit in the calendar. |
| Sending briefs to real creators | The UGC "creator" steps are clicked through by hand (demo) |

## Code map

```
src/
  main.tsx            page routes and layout
  styles.css          all styling (colours at the top)
  components/         side menu, icons, pop-up message
  pages/              one file per screen
  lib/types.ts        the shape of a brand, post, trend
  lib/store.tsx       saved data
  lib/generate.ts     stand-in AI writer  ← plug AI in here
  lib/mockData.ts     fake trends and stats
```
