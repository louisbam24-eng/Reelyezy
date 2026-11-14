# Trend Remix: scope

Pick one viral short video. Get back a copy of it, detail for detail, with their brand swapped for yours, as an MP4 plus the script and storyboard behind it.

Phase 1 is a personal testing tool. The product (logins, brand profiles) comes later.

## Why

The apps that do this today try to do too much and are hard to use. This one does one thing: recreate this video for your brand. (From the co-founder's voice note in `notes/`.)

## Phase 1 flow

1. **Find:** `scripts/find.mjs` searches YouTube Shorts hashtag pages with `yt-dlp` (TikTok and Instagram block the free scrapers; they need Apify later) and lists videos posted in the last 30 days that went viral because of the video, not the account: small creators (under 50k followers) whose video got at least 10x their follower count in views, and 100k views or more. All three numbers are settings. Claude checks each candidate's frames and drops live-action videos (a person or real footage on camera), since the copy is an HTML animation and can only fully copy text, graphics and screen-recording videos. You pick one.
2. **Download:** `yt-dlp`, with metadata (views, likes, followers, sound name).
3. **Break down the video:**
   - `ffmpeg` pulls frames at a fixed interval and detects scene cuts
   - `whisper.cpp` transcribes it, locally and for free
   - Claude reads the frames and transcript and writes a shot-by-shot breakdown of everything there is to copy: hook, every cut and its timing, on-screen text and its style, colour, motion, pacing, and which parts are their brand
4. **Brand info:** one file per brand (name, product, audience, tone, colours, logo).
5. **Generate:** the same video with only the brand swapped.
   - **Script:** the voiceover and on-screen text, beat by beat, matched to the original's timing
   - **Storyboard:** a frame per beat, beside the matching frame of the original
   - **Animation:** one HTML file, animated over time, as in SaleLinx `Marketing/tiktok/*.html`
6. **Audio:** see below.
7. **Render:** a draft at 240p. Claude compares it with the original, fixes it itself (max 3 rounds), then writes `fix-notes.md` listing anything it couldn't fix. You watch it, then re-render at the quality you want.
8. **Out:** a folder per job containing `video.mp4`, `script.md`, `storyboard.html` and `fix-notes.md`.

## Render quality

One setting: `240p` (default draft), `480p`, `1080p` or `4k`. The renderer is lifted from SaleLinx `Marketing/tiktok/hero-render.mjs` (Playwright frames into ffmpeg), which already works at 1080p and 4K.

## Audio (ElevenLabs API)

Phase 1 runs on the free plan: 10,000 credits a month, non-commercial.

- **Voiceover:** text-to-speech with timestamps returns timing for every character, so captions and animation beats line up with the voice automatically.
- **Sound effects:** generated from a text prompt, royalty-free.
- **Music:** paid plans only (the API refuses free keys).

How the agent "watches" and places sound: Claude can see video frames but can't hear audio. So it reads the storyboard and frames, decides what sound goes where ("whoosh at 0.8s on the cut", "pop on each caption"), and writes that as a list of cues. ElevenLabs generates each sound, and `ffmpeg` mixes them in at the right times. To check the mix, Claude transcribes the voiceover back and reads the audio levels from `ffmpeg`.

## Trending sound

- The original's sound plays over the draft, so you can hear the copy as it would be posted.
- **Before anything is posted or sold:** copyrighted tracks get muted or flagged by the platforms. The final MP4 either uses a generated track "in the feel of" the original (needs a paid ElevenLabs plan), or ships without music so the sound is added in the TikTok or Instagram app when posting.

## How it runs (phase 1)

Claude Code is the agent. The repo holds plain Node scripts (find, download, frames, transcribe, render, mix) and a `CLAUDE.md` that tells Claude the steps. `node scripts/ui.mjs` serves a local page at localhost:5178 that runs each step with a button, streams its log, and edits shot timing and lines. Its Claude steps run headless `claude -p`.

## Later (product)

- Logins and saved brand profiles
- A weekly set of videos to pick from, using the phase 1 scraper
- Move from Claude Code to the Claude API behind a web app
- ElevenLabs Startup Grant once there's a demo and a website (one application per company, business email)

## Needed to start

- ElevenLabs API key (done, free plan, in `.env`)
- One brand to test with
