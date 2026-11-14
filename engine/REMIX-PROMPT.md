# Trend Remix: viral video to brand video

Paste this into Claude Code from the repo root (`~/Documents/Dev/trend-remix/engine`), with the three inputs filled in.

```
VIDEO:  <TikTok / YouTube Shorts / Reels URL, or "find one">
BRAND:  brands/<brand>.md
LOOK:   <optional: "same as the source", or a style, e.g. "blocky toy 3D", "Disney-like 3D">
```

---

You are remixing a viral short video for a brand. You will copy everything that made it work: its formula, beat structure, timing, narrator style, look, camera grammar and sound design. Then you'll swap the subject for the brand's customer and the brand's product. The result is a finished vertical MP4 at the same standard as `jobs/7702894571469966625` (the @unnecessaryengineering "raincoats are useless" remix for SaleLinx). Before you start, open that job's `script.md`, `remix/shots.json` and `remix/scene.js`; they are the reference for every step below.

Work through the phases in order. Stop only at the two gates (the story, and the final cut). Everything else you decide, build, check and fix yourself.

## Hard rules

- **Claims:** only what the brand file allows, and for SaleLinx only what `~/Documents/Dev/SaleLinx/Marketing/PRODUCT.md` says, including its "never say" list. No prices and no income claims. Say "14-day free trial", never "free plan". The end card carries "Not affiliated with Depop, Vinted or eBay" (or the equivalent for the brand's platforms).
- **Brand assets are real:** use the logo file named in the brand file and real app screenshots. Never draw a substitute logo or invent a UI.
- **Copy the format, not the creator:**
  - Never use their name, handle, characters' likenesses, watermark or branding.
  - Never clone their voice.
  - Their music is reference only. It can play under a draft, but the final cut never ships with it.
- **Secrets:** API keys live in `.env` and get there only through Lewis's own terminal (`read -s`). Never print, echo or log a key.
- **Credits:** ElevenLabs is on the Starter plan since Nov 2026 (34,448 credits on 11 Nov with rollover, resetting on the 1st; about 1 credit per character), so library voices work too. Check the balance before and after every generation run, never regenerate a file that is fine, and report what was spent. The `/v1/user/subscription` count lags generation by minutes, so a balance read straight after a run is too high; wait and re-read before spending what looks left over (a quota error states the true figure).
  - Balance: `curl -s -H "xi-api-key: $ELEVENLABS_API_KEY" https://api.elevenlabs.io/v1/user/subscription`, then `character_limit - character_count`.
  - The balance lags the charge by up to a minute; wait 30 to 60 seconds after a run before reading it.
- **Git:** commit or push only when asked.
- **Chat:** short updates. Findings go in the job's files, not in long chat messages.
- **Keep this file current:** whenever Lewis corrects or refines anything, add the lesson to the phase it belongs to in this file, in the same session, before delivering. A mistake he has caught once must never reach him again.
- **Estimates are promises:** if a runtime or credit estimate turns out wrong, say so plainly at delivery.

## Phase 1: Find (skip if a URL is given)

`node scripts/find.mjs <hashtags from the brand file>` writes `jobs/candidates.json`, sorted by views-to-followers ratio.

- **Thresholds:** `DAYS=30`, `MAX_FOLLOWERS=50000`, `MIN_VIEWS=100000`, `MIN_RATIO=10`. These mean the video went viral on its own merit, not because of a big account.
- Only YouTube Shorts scrape for free. TikTok and Instagram block the free scrapers.
- Look at frames of each candidate. Prefer animated, graphic, text-led or screen-recording videos; live action (a real person on camera) can't be copied detail for detail. The best fit is a repeatable comedic formula with a narrator, because the formula survives a subject swap.
- Show Lewis the top five with links and a one-line reason each, and let him pick.

## Phase 2: Break the source down

1. Run `node scripts/breakdown.mjs <url>`. It writes the following into `jobs/<id>/`:
   - `source.mp4` and `info.json`
   - `sheets/NN.jpg`: 4x4 grids at 4 fps, so sheet N covers seconds 4(N-1) to 4N
   - `cuts/` frames at each scene cut, with their times in `cuts.txt`
   - `audio.wav`
   - `transcript.srt`, from `whisper-cli` with `models/ggml-base.bin`

2. Read every sheet, every cut frame and the whole transcript. You can't hear audio, so infer the sound design from the transcript, the visual events and what's on screen. Then write down:

- **The formula,** in one sentence. Example: "a problem gets an absurd gadget fix; each fix causes a new problem; the escalation ends in something enormous; the punchline is that the original problem was trivial."
- **The beats:** every beat with start and end times, what's on screen, and the exact narration.
- **The narrator:** voice type, accent, delivery, and catchphrases (e.g. "Perfect!", "Except...", "Easy!", "Might as well...").
- **The look:**
  - render style, palette and lighting
  - character design and set
  - recurring motifs, such as rain through the window
- **Camera grammar:** close-ups as each gadget arrives, low angles, wide reveals, push-ins, cut rhythm.
- **Captions:** position, case, size, stroke, words per card. `"words": 1` gives one word per card; `assemble.mjs` skips its short-card merge then.
- **Sound:** an effect per event, an ambient bed, music or none.
- **Runtime and pacing:** average shot length; where the hook lands and where the punchline lands.
- **What to drop:** everything that is theirs.

## Phase 3: Story (gate 1)

Write `jobs/<id>/script.md`, using the reference job's `script.md` as the template.

- **The story map:**
  - Two short paragraphs.
  - The first maps their formula onto the brand's customer.
  - The second covers what stays the same: narrator style, beat count, beat timing, the look, and the motif kept as a nod to the original.
- **Every escalation beat is a real customer pain** that the product solves.
  - For SaleLinx these were:
    - listing the same item three times
    - each app wanting the details written differently
    - double-selling
    - listings sinking out of sight
  - The joke is the absurd fix. The pain must be true.
- **Keep the punchline's shape.** Theirs: a full-sized car, and now you have to get out of the car. Ours: a full-sized factory, built to sell one hoodie.
- **The tag:**
  - After the punchline, a short tag of about 5 seconds: "Or just get <Brand>." plus one claim-safe line.
  - **The tag answers every pain the video showed, not just one.** Lewis, 11 Nov 2026, when the tag only covered crosslisting. Give each pain one short PRODUCT.md-true line (double-selling to take-down, relisting to relist, inboxes to messages, parcels to labels). Show each on the real panel screenshot: a cursor clicks that sidebar item while the pain's label from the video is struck through at the top. Leave out screenshots that show buyer handles, such as messages and offers. Name Pro/Business-only features in a small line on the end card. This makes the tag about 15s long.
  - **Pick tag features from the story, not the feature list.** Lewis, 11 Nov 2026, when the lowballer tag stopped at crosslist and messages. Map each story beat to a feature (lowball offers to auto-accept above your minimum, "playing dead" to Dead Stock). Never strike a pain the feature doesn't cure: take-down is not instant, so don't strike "SOLD TWICE".
    - The lowballer job used "$2 OFFERS" → Auto-accept, "DELIST BY HAND" → Linking and "PLAYING DEAD" → Dead Stock. Each beat runs about 2.2–2.6s, with the click on the narrator's key word.
    - Layout on the 1080×1920 HUD: feature pill at y 210–314, struck label at y 432 (110px, fitted to 980px), panel at y 540–1408, clear of the caption band.
    - Zoom the real `my-listings.png` (2940×1604) from `[0,0,1230,1068]` to the sidebar `[0,450,760,660]`. Item y values: Dead Stock 548, Auto-Offers 610, Linking 672, Offers 890, Messages 952.
    - Earlier highlights stay lit. The helper is `panel()` in job 7702443165554576660's `scene.js`.
  - **A full-screen text card holds long enough to read twice.** Lewis, 11 Nov 2026, when the 1.4s "PREY." card flashed past. Hold at least 1.2s after the last word lands, so a card like this runs about 2.6s.
  - **A local-voice line's `dur` forces its length.** When a line's text changes, set a new `dur` at about 0.26s per word, or the engine squeezes the line and drops words. Then whisper every retake.
  - A real-screenshot screen card goes under the tag.
  - **When the claim is crosslisting, show it moving, not a still.** Lewis, 10 Nov 2026: the real crosslist popup appears, then a short animation carries the item's details (photo, title, price) over to the other site. Build it from the real screen recording in SaleLinx `Marketing/tiktok/rec/` (frames plus `data.js` timings, recorded by `Marketing/screenshots/panel-screenshots/record-crosslist.mjs`). The flying details are cut out of those real frames, never redrawn.
  - The end card follows: logo, CTA, disclaimer.
- **Write the script as a table** with columns `# | Time | Picture | Narrator | Sound`, matched to the source's beat times.
- **Add the extras:** a post title with hashtags, and a Notes section that checks every claim against PRODUCT.md.
- **Description, every job once it's done, without being asked (Lewis, 11 Nov 2026).** Save it to `out/description.txt` and deliver it with the final cut.
  - Copy the source's caption shape from `info.json` `description`: its hook line with our subject swapped, and hashtags in the same roles (topic, topic variant, audience, location). Use 3 or 4 niche tags from the brand file.
  - No brand name, no CTA and no claims, so it reads as organic. The video carries the product.
  - **It must sit cleanly in the feed** (when "yo / u?" broke across the lines). TikTok's preview fits about 44 characters per line, breaks mid-word and ignores line breaks. So write a question of about 41 characters, then one emoji to fill the rest of line 1, and the tags wrap whole onto line 2. Lewis approved, "the right way": "What to do if a lowballer is hunting you? 👀 #reseller #depop #vinted #ebayreseller" (from the source's "What should you do if you are attacked by a polar bear? | Part 1 #survival").
- **Hard cap: the whole video is 60 seconds or under, tag and end card included (Lewis, 11 Nov 2026, every video from now on), unless Lewis lifts it for a job (12 Nov 2026, Reseller's House: "it can be longer than 60 seconds, I want this to be a great script and progressive"; 13 Nov 2026, far-angle reseller house: "keep the video preferably 2 mins or less"). A lifted cap buys more levels, never slower pacing.** Budget it before writing the table: the end card (about 2s) and the tag come off first, and the story gets what is left, about 9 or 10 beats at the trackable pace below. Cut beats, never speed. Each pain in the story needs its feature in the tag, so cutting a pain cuts its tag line too.
- **Script length:**
  - Lines should fit their beats at a natural pace, about 2.5 words a second.
  - Give the sceptic voice lines that challenge the narrator, so the piece is a dialogue rather than a lecture.

- **The story must make sense on its own terms.** Every beat has to be both true to the source's moment and a clear step in the brand story; a viewer should never wonder what a picture means. If the source's beats don't map cleanly onto a real customer pain, don't force it: get creative and offer Lewis **5 different story ideas** (a line each for the premise, the mapping and the punchline) and let him pick before writing the table.

- **Open on a universal annoyance, then narrow (Lewis, 11 Nov 2026, Unsold Bag: "the hook isn't relatable and doesn't make sense, make it more general like so you have a bag but it never has enough space, then progressively change to our story").** Line 1 is something anyone has felt, in plain words. The reselling world arrives by about beat 5, one step at a time. A hook that starts deep in the niche ("drag a bag of unsold clothes") loses everyone else.
- **Make line 1 a relatable question (Lewis, 11 Nov 2026, Spare Room Depot: "make the hook better, make it more relatable an interesting question").** Ask something the viewer answers "yes" to in their head, e.g. "Got clothes you'll never wear again?", then the next clause turns it into the story. A statement hook ("Sell your old clothes from your spare room") was rejected.
- **For a level-up story, name the viewer, then promise the top (Lewis, 12 Nov 2026, Reseller's House: "start it off with, are you a reseller, this is how to get to the top").** Open on the maxed-out ending with "Are you a reseller?" and "This is how to get to the top.", then rewind to the start.
- **Or a first-person from-to promise over the maxed ending (Lewis, 13 Nov 2026, far-angle reseller house: "this is how i went from selling one hoodie to making 100k+ in one year").** Keep the shape, but the "to" is a visual milestone ("taking over the whole house"), never money: PRODUCT.md bans revenue figures and testimonials, so an income figure needs Lewis's explicit OK.
- **Keep it trackable (same note: "it's going too quickly, we need to be able to keep track of what is going on; it needs to be progressive").** One idea per beat, as many beats as the 60s cap allows, at normal speed with no speed-up. One object in one place that builds up: every fix bolts onto it and stays visible, so no beat resets to a new set. Problems and fixes get one label pattern at the same spot: red for the problem ("0 VIEWS"), yellow "+" for the fix ("+ WHEELS").
- **Perfect pace (Lewis, 11 Nov 2026, Unsold Bag: "it's a bit slow now, it needs to be perfect pace").** Trim each voice line's leading silence to about 0.04s (TTS adds 0.15 to 0.65s; find it with `silencedetect`) and shift its word timings by the same amount. Then about 0.35s of quiet between one line's last word and the next line's first, across cuts too. A shot runs past its line only for its visual payoff to land (a burst, a drop, a fold), never as a plain hold. Key camera moves to `D.dur`, not a fixed number, so retiming a shot doesn't stall its camera.
- **Grow the object in steps (same note: "it goes from the small bag to big bag way too quickly, we need to build progressively").** When the object gets bigger, each beat grows it by about 1.5x at most, each step its own beat with its own "+" label (gym bag, + BIGGER BAG, + EVEN BIGGER, + HUGE BAG), and it keeps swelling a little between fixes. Never jump sizes across a cut.
- **The first 5 seconds carry the video (Lewis, 12 Nov 2026, Propbar: "we need the start to be more eye catching, the first 5 seconds are the most important").** Even when the source is text-only, voice the hook from 0s. Hook text is black on yellow bars, slammed in word by word on the voice, and the first word is already up on frame 0. Never white text over a pale picture. Use a saturated hero object, not a pastel one. Show the pain in frame 1 (a falling price with strike-throughs, "0 likes · Listed 47 days ago" counting up), burst the real Depop, Vinted and eBay logos out by about 1.6s, and reach the big reveal (the fly-out) by about 3.4s, not 5s.
- **The open moves from frame 1 (Lewis, 11 Nov 2026, Unsold Bag: "it's slow and weird at the start").** The hero is already mid-action on the first frame, three-quarters to camera with his face showing, never side-on or head down. Cut any pause over about 0.3s inside a line (`silencedetect` at -30dB), most of all in the hook, then re-time its words. Nobody stands still as a mannequin: idle breathing, relaxed arms, reactions on each beat.
- **Boy and girl trade lines all the way through (Lewis, 12 Nov 2026, Reseller House: "we need the voices to be continuous back and forth boy and girl so there's no silent pauses… clean as the animation keeps going").** Alternate the two voices line by line, about 0.35s apart, from the first second to the last. Where a visual payoff needs time (a crane, a floor arriving), fill it with a short reaction line from the other voice rather than holding in silence. The sceptic asks or reacts, the narrator answers.
- **Spend the most effort on the first 5 seconds (same note: "the first 5 seconds are the most important").** Plan the opening 5s as its own beat sheet before the rest: the biggest image in the film, motion from frame 1, the relatable question spoken by about 0.2s, and a reason to keep watching by 5s.
- **The top tier goes over the top (Lewis, 12 Nov 2026, Reseller's House: "the house can be even crazier").** The last level stacks set pieces the viewer reacts to one by one (a helipad and landing helicopter, a drone fleet, a gold hoodie statue, neon, floodlights, fireworks), each with its own line in the ping-pong.
- **Clear over clever (Lewis, 11 Nov 2026, Spare Room Depot: "a bit hard to follow, keep it as clear as possible so we can keep track of the story").** Strict pairs: each "But" pain is followed straight away by its "So" fix, never two pains in a row, and no pain shown twice. One label per beat, held until the cut: no time stamps, gag names or extra white labels beside it. The tag strikes through the exact story label ("SUNK", not "SUNK BY 11"). When a metaphor is introduced, say plainly who it is ("She's the boss now", not "This is the council").
- **Pick a metaphor everyone already lives in (Lewis, 11 Nov 2026, Spare Room Depot: "council sounds weird… make it she's the boss and we're building a business").** Council and depot were rejected for boss and business. Every fix is an everyday work word (overtime, dispatch, stock code), so no fix needs explaining.
- **Show the brand's real world early.** The hook uses the customer's real platforms, e.g. Depop, Vinted and eBay logo tiles bursting out of one phone. Abstract stand-ins ("weird things", generic bubbles) were rejected.
- **Money and slang match the voices.** The voices are American, so prices are in dollars ("two dollars", not "two quid").
- **Escalate in tiers, and make the CGI the payoff (Lewis, 11 Nov 2026: "progressively crazier, the cgi has to be really cool").** Write the story map with a craziness ramp: street-scale slapstick first, then machines unfolding Transformer-style, then a day-to-night finale (floors assembling, floodlights slamming on one by one, a blimp, jets, fireworks, a pull-out to orbit), then a callback that folds it all away.
- **Level up the hero's own place (Lewis, 12 Nov 2026, cutaway-house source: "progressive like a reseller's house, how it upgrades over time the better he is… then ridiculous until his house is maxed out").** When the source is one set seen whole, swap a wrong-way/right-way split for a levelling arc. The set is the hero's home, and each pain-then-fix beat adds one visible upgrade that stays (stockroom, packing bay, new floor). It ramps to absurd and ends on a MAX counter, then dives back to the opening spot. Credit the growth to him and the chores to the product, so nothing promises sales.
- **A new take on one of our own videos is a new video (Lewis, 13 Nov 2026, far-angle reseller house: "we dont want to reuse the last video we want this one to be different yet still cool and ridiculous").** Keep only what he names (here: the cutaway house and the reseller levelling up). Change the hook, the voices' roles, the set pieces, the progress marker and the ending, and never reuse the earlier job's gags (open on max and rewind, crane floors, helipad, drones, gold hoodie, MAX board).
- **Hold the brand back to the tag when the story is a grind (Lewis, 13 Nov 2026, far-angle reseller house: "we shouldn't mention SaleLinx until the end… he clones himself for crosslist… insane things you have to do to become a good reseller, then at the end it shows SaleLinx and how you can use that instead").** Each pain gets an absurd manual fix that stays in the set (clones to crosslist, Dad on a wall of screens to delist), the fixes pile up into chaos, and only the tag names the brand, striking each pain and undoing each absurd fix.
- **Never crop the logo out of an app screenshot (Lewis, 13 Nov 2026, far-angle reseller house: "it uses the old logo make sure it uses the new one").** The screenshots still carry the old lynx in the sidebar header. Draw any SaleLinx header from the logo file in the brand file plus "SaleLinx" in Inter, and crop only feature rows from screenshots.
- **A far, locked shot still moves (Lewis, 13 Nov 2026, far-angle reseller house: "lets get a bit of camera movement").** Keep it across the street, but glide slowly between keyframes onto whatever the current beat is about (the bedroom for the clones, the living room for the screen wall, the roof for the cannon), on a smooth spline with continuous velocity, then pull back wide for the tag so every card line lands in frame.
- **Push the comedy further than feels safe.** Lewis wants it "funnier and crazier". Every beat should carry a visual gag on top of its line: physical comedy (a door blown off, a hand poking out of a pile, a head on backwards), a recurring victim (the neighbour who is dragged along to space), escalation past the script (an airliner swerving round the tower, aliens messaging in), and a callback that undoes it all (the station crash-landing back on the street). Offer about 10 such ideas once the first cut is up.
  - **Take the source's advice literally (Lowballer, Nov 2026; Lewis took all 10).** For a survival guide: "make yourself bigger" made Jake inflate like a puffer fish, then deflate with a squeak. "Don't play dead" ended on the lowballer playing dead with dead-bug legs. "Run" became a penguin belly-slide.
  - Other gags that landed: nature-documentary lower-thirds ("JAKE, *Resellicus exhaustus*"), a baby lowballer offering "$0.50?", every window on the street lighting up with "$2?", "$2?" written in window fog, a choir beam on the SaleLinx phone, and a "DIGNITY 0" stat.
  - Give each gag its own sound (squeak, balloon, choir, whistle, stamp).
  - **Gags that landed on the clear-out job (Nov 2026; Lewis: "great video").** Mum flicks a 42nd sheet onto the wall as "41 TABS" ticks to 42. The cat lies down on the phone that just sold. A one-star review squashes him like a pancake. A tiny violinist plays on the sad card. The parcel stack topples as a "DAYS WITHOUT AN ACCIDENT" sign flips from 1 to 0. "EMPLOYEE OF THE YEAR" hangs at the post office. A third arm sprouts to type on a third phone, labelled "THIRD ARM".
- **Stage "This is the…" naming cards literally, as pop-up labels over the 3D shot,** not as separate cards. "This is the Vinted ghost" first showed him fading out with his phone floating, which didn't read. Lewis swapped it for the corner of the room with a sheet ghost holding a phone.

Show Lewis the story and **wait for approval** before building anything.

## Phase 4: Pick the production route

- **Code-built 3D (Three.js): the default, and what reached the standard.** It's deterministic, its continuity is perfect, every frame can be iterated on, and it costs nothing.
  - Files: `scripts/render3d.mjs` and `remix/scene.js`.
  - It reuses `scripts/kit3d.js`.
- **AI images plus AI video** (`scripts/generate.mjs refs|stills|clips|sync`, Kling): already tried and judged "a terrible video". Inconsistent characters, no real control over timing, and drift between shots. Only use it if Lewis asks.
- **HTML animation:** for text-led, graphic or screen-recording sources (as in SaleLinx `Marketing/tiktok/*.html`). The screen and end cards are already built this way inside `assemble.mjs`.
  - A whole HTML film is one page exposing `DURATION`, `seek(t)` and `SFX`; `node scripts/renderhtml.mjs <page> <out.mp4> [--lo] [--at t,...] [--sound-only]` renders it (reference: job 7706546133518093590, the NetSold-format ad). Panel screenshots are light, so on a dark film blur and darken the page behind a focused card (brightness about 0.2), and crop each card to about 900px of the 2940px capture so its text reads.
  - For a SaleLinx product ad, Lewis's favourite is the hub diagram: the marketplace tiles wired to the SaleLinx hub. Give every eye-catching feature its own beat (crosslist, take-down, relist, auto-offers, auto-accept, price drops, messages, labels, shop layout, follows, Restocker), and leave out dull ones such as refresh.
  - **No screenshot cards for features (Lewis, 14 Nov 2026: "I don't like these last few animations which are screenshots").** Every feature gets a clean animated scene in the same style as the hub beats. The only screenshot is My Listings, after the logo, so viewers see what the real panel looks like.
  - **Every feature gets its own animation, not the same flow re-skinned.** Lewis asked for each one to be "super polished and unique", but still easy to follow. The hub stays as the anchor, stepping back blurred while a scene plays. Reference: job 7706546133518093590.
    - Crosslist: one listing clones out along every line.
    - Take-down: a SOLD stamp, then a shockwave that pops the other listings.
    - Relist: a feed where the listing sinks, then jumps back to the top.
    - Auto-offers: likers' hearts come in and offers go back out.
    - Auto-accept: offers fall onto a "your minimum" gate.
    - Price drops: a rolling price tag over a stepped chart that stops at the floor.
    - Messages: the hub unfolds into one inbox.
    - Labels: labels pile up and fold into one PDF.
    - Dim the tiles a feature doesn't support (for example, auto-offers is Vinted only).
  - **Style it like proper software, not a game (Lewis, 14 Nov 2026: "less gamerish and more professional").** No neon glows, particle bursts or screen shake. Use thin hairline borders, soft dark shadows, gentle easing and brand green/red, with yellow kept for accents. Reference: `remix/ad-pro.html` in job 7706546133518093590.
  - **Item photos must be sharp at 4K (Lewis, 14 Nov 2026: "the images of the items are blurry").** Never crop item thumbnails out of panel screenshots; they are about 90px. Use the 800px product photos in SaleLinx `Website/resale-bot-web-ebay/public/products/`.
  - **Every marketplace can do every feature (Lewis, 14 Nov 2026).** Never show a feature on only some marketplaces: no dimmed tiles, and no "Vinted only" or "Depop and Vinted" scenes or status lines. Offers, accept, messages, labels, shop layout, follows and Restocker all show all five.
  - Etsy and Shopify are full platforms in SaleLinx ads (Lewis, 14 Nov 2026: "they will be done"). Never mark them "soon". Show five tiles, list all five in "Works with" and the "Not affiliated" line. Check that PRODUCT.md has caught up before posting.

## Phase 5: Shot plan, `remix/shots.json`

The schema is the one in the reference job:

```jsonc
{
  "picture": { "w": 1080, "h": 1920, "y": 0 },
  "style": "one paragraph: render style, light, weather, setting, camera grammar",
  "characters": { "hero": "exact look, with brand colour hex" },
  "set": "the main set, with every prop that recurs",
  "voices": { "narrator": "<premade voice id>", "skeptic": "<premade voice id>" },
  "voice_model": "eleven_v3",
  "voice_settings": { "stability": 0.5 },
  "say": { "SaleLinx": "Sale Links" },              // pronunciation; captions keep the real spelling
  "caption_style": { "upper": false, "y": 0.75, "size": 60, "stroke": 8, "words": 5, "chars": 24 },
  "speed": 1.1,                                      // whole cut played faster at the end; sync is kept
  "shots": [{
    "id": 9, "dur": 4.6,
    "image": "what is on screen",
    "motion": "what moves and when",
    "lines": [{ "at": 0.05, "who": "narrator", "text": "[excited] Easy!" }],
    "sfx": [
      { "at": 1.0, "dur": 2, "vol": 0.5, "prompt": "short emergency siren wail" },
      { "at": 0.0, "file": "sfx-01-1.mp3", "vol": 0.3, "for": 4.6 }   // reuse a file; "for" loops it as a bed
    ]
  }],
  "screens": [{ "file": "<real screenshot>", "text": "headline", "dur": 4.35, "width": 2940, "height": 1604,
                "from": [x, y, w, h], "to": [x, y, w, h], "click": [x, y], "lines": [...], "sfx": [...] }],
  "end": { "dur": 2.2, "line": "one claim-safe line", "cta": "14-day free trial", "small": "Not affiliated with ..." }
}
```

Rules that matter:

- **Effect file names follow position.** Effects are stored as `sfx-<shot>-<index>.mp3` by their position in the list. When you add effects later, **append** them so existing files keep their index. To reuse an effect elsewhere, point at its file rather than generating it again.
- **Screen card crop:** `from` and `to` pan across the screenshot. Crop tight (about 900 px wide on a 2940 px capture) so the UI reads on a phone; the whole screenshot shown small is unreadable.
- **Shot durations match the source's beats.** The tag and end card add about 5 to 8 seconds on top.

## Phase 6: Build the scene, `remix/scene.js`

**Contract:** export `setup(id)` and `frame(t)`. Write each shot as `S[id] = () => { const st = stage({ fov }); ...build...; return (t) => { ...animate...; st.look(camPos, target, fov) } }`. Inside a shot:

- Keep tags and headlines below y 170: TikTok's "Following | For You" bar covers the top of the frame.
- Headlines over the pale town are dark with a white halo; white text washed out (Propbar, 12 Nov 2026).
- **No flicker or phasing (Lewis, 12 Nov 2026: "the road keeps flickering").** Surfaces that overlap sit at least 1cm apart (streets 3cm, cross roads 4cm); kerbs stop at junctions; lawns, hedges and trees stay clear of kerbs and walls; nothing parks in a junction; looping cars shrink away at the edge rather than jump. Set the camera's near plane to 2% of its distance to the target every frame. Keep per-frame grain at about 0.012: higher, it encodes as crawling blocks on flat ground at 480p.
- **Phasing in 3D scenes (Lewis, 12 Nov 2026, Reseller's House).** Paint road and pad markings into the texture instead of laying strips on top. Props on a wall sit in front of its inner face, never inside the slab. Hide glow strips while their glow is zero, or they read as black lines. Anything that flies, lifts or swarms (drones, cranes, helicopters, cards, floors sliding in) routes around the house and starts in front of walls, never behind them. Stars are soft sprites, not points. Before delivery, run a camera-inside-mesh probe and a moving-mesh intersection scan over every frame, and fix every hit that is not by design.
- **No one-frame glitches at cuts (Lewis, 14 Nov 2026: "this looks glitcht").** Anything that changes at a cut (who is visible, expressions, positions) switches at exactly the camera cut's time, including any early offset like `t0 - 0.04`. Before delivery, list frame jumps with ffmpeg's scene score and look at the frames either side of each cut. Eyelids are domes over the eyeball, never boxes on the face.
- `st.hits.push([time, shake, flash])` adds camera shake and an exposure flash.
- `st.whips.push(time)` adds a whip pan.
- `st.ticks` runs per-frame callbacks.

**Reuse:**

- **The kit:** `scripts/kit3d.js` provides `stage`, `G` (geometry), `mat`, `glow`, `tex`, `person`, `laptop`, `parcel` and others.
- **The reference scene.js:** it provides `sparks`, `shock`, `twinkle`, `dust`, `rain`, `reach`, `robotArm`, `belt` and others. Copy whatever helpers fit.
- **Shared sets:** build each set as a function (`sorterRoom(st)`) that every shot in that location calls. Then props stay in exactly the same places from shot to shot.

**Clean and professional, like the SaleLinx video that performed** (Lewis, 12 Nov 2026, pointing at tiktok.com/@salelinx/video/7706271766640905504):

- No camera shake or whip pans: every shot holds or pushes in slowly. `stage({ shake: 0 })`, and hits give only a soft flash.
- No sticker labels ("+ BIGGER BAG", "$2?", "ONE HOODIE") and no cartoon gags (dizzy stars, a sock in the face, a pigeon, a blimp). No red problem pills either (Lewis, 13 Nov 2026: "get rid of the red bubbles"): the picture shows the problem. Nothing goes on screen but captions, real UI and the story's own counter.
- Open on the problem with a relatable question, then a deadpan face close-up: "Let's fix that."
- Each gadget lands in a smoke puff; "Perfect" gets confetti; the set keeps what came before.
- Two framings per beat: a hard in-shot cut to an insert (the dial, the facepalm) on the key word.
- **Something changes every 2 to 3 seconds (Lewis, 13 Nov 2026: "the watchtime will drop very quickly, we need to make it engaging throughout").** Even on a one-camera set, push into the room where each gag lands and back out for the next. Cut beats rather than rush them: about 55 to 60s, with the product by about 35s and a tag of about 20s.
- After the last "Except", hold a deadpan face for about 2s with one blink before the product.
- The product shot carries a yellow highlighted headline ("List once." / "Crosslist to Depop, Vinted & eBay.").
- Leave about 0.5s between beats instead of 0.35s; the reference runs about 2.6 words a second.

**Sleek, not toy-bright (Lewis, 14 Nov 2026: "lets work on the colours and scenery, and lighting lets make it hella sleek").** Dark room (near-black navy background and fog), lit by coloured practicals: a violet LED strip with an additive wash up the wall, a warm lamp on the shelf, a cool fill from above, a warm spot on the poster. Dark desk with an underglow line, black laptop with a small glowing white logo on the lid, muted props. Inserts sit on a radial-gradient backdrop with soft bokeh, never a flat colour. End card on a dark gradient to match. Wash planes are front-face only: check they face the camera.

**The standard each shot must meet:**

- **It's never static.**
  - `frame()` already applies a slow handheld drift and a push-in.
  - Add a beat-driven event on top: a gadget arrives, something breaks, a reveal.
- **It has a special moment.** At least one visible piece of spectacle per shot, landing on the narration's key word. Effects already built:
  - a lightning strike, with a flash and a point light outside the window
  - a dolly zoom on "Let's fix that"
  - sparks as robot arms clamp on
  - holograms rising from the screens (additive blending)
  - red "!" glyphs with shock rings on each error
  - confetti on each green tick
  - a crash zoom on "Sold"
  - a hammer smash: glass, sparks, shock ring, dust
  - an eye twinkle on the smug beat
  - a time-lapse sun crossing the window
  - fireworks over the factory
  - a spotlight on the punchline
  - gold sparks on the tag
- **The voice drives the character.** Mouths open with the loudness of the lines. Heads turn and nod on the key words. Faces show the beat: brows, mouth open, flinch.
- **Cuts land on events.** Use `cut(t, [times])` for cuts inside a shot, with a whip on each.

**Continuity and physical sense.** These are the mistakes Lewis caught; check every shot for them:

- **Parts must connect.** Machines plug into what they feed. The sorter's three loose chutes became three hoses running into the three laptops, grown in when it is bolted on, with pulses travelling down them.
- **No clipping.** No hair through a hood, no hat-brim artefacts, no laptop lid inside a machine, no limbs through furniture.
- **The camera is never blocked.** Not by a head, not by a prop sitting in front of the lens, and the camera is never inside geometry.
- **One-take films move smoothly and never stop (Lewis, 12 Nov 2026, Reseller's House: "the camera movement needs to be smooth and continuous").** Sample the keyed path at 60Hz and Gaussian-smooth it (σ about 0.3s) so speed never jumps at a key. No slow-in or stall keys. Landing kicks go on after the smoothing, as short decaying rotations.
- **Nothing on screen is ever still (Lewis, 14 Nov 2026, Price Drop Sunday: "make it feel less ai and static and make it super good alive animation thats satisfyig to watch").** Every character breathes, blinks on a varied schedule (with doubles, and once after each cut, never on frame 1), darts its eyes and drifts on low-frequency noise, not sines. Speech drives the body: head nods, brow pops, a small squash, and hands, paws or held props kicking on stressed words, with a different mouth shape per word. The listener nods to the speaker. Pets get a swishing tail. UI moves on springs: toggle knobs overshoot, cursors move in arcs with a click ripple, numbers roll, rows and chips pop in, and buttons reach a done state on screen. The camera floats gently (about 0.015, under 0.4Hz, never shake), and pushes are front-loaded. Captions punch in two frames larger (`caption_style.punch`).
- **Every named prop reads as itself.** "Robot packer" must look like a robot arm doing a packing action on the box, in frame. It must not read as two brown sticks off to the side.
- **Screen-left is not always −x.** Work out the direction from the camera before placing details like an eye twinkle.
- **Flashes don't stack** on bright lights and white out the frame.
- **Particles are big enough** to read at 480p (confetti about 0.036, fireworks about 0.22).
- **Characters face where they walk.** Lewis caught clones walking sideways into a booth and a picket line marching backwards. Walk along curved paths, turn the body to the direction of travel, and turn smoothly to camera on arrival.
- **Nothing passes through doors, walls or each other.** Clones walking out must use the doorway, leave furthest-mark first and leave far enough apart that bodies never overlap.
- **Badges and props above heads sit clear of the head**, sized to read at 480p.
- **Nothing is mid-air on frame 0.** A burst that launches a flight time before the shot starts shows stray objects on the first frame.
- **Damage persists.** Once the door is blown off or a window is broken, every later shot of that place shows it. Use one shared function for the damage (e.g. `wreck(home)`) and one shared set function per location (e.g. `site(st, Y)`) so the hoodie, houses and rain match between shots.
- **A gag phone needs a bright screen.** The camera viewfinder screen is dark, and at 480p it reads as the back of the phone. Use the listing or chat screen.
- **No props stuck to the face, no hands clasped round a phone at the waist.** A phone in the mouth looks glued on; two hands round a bagged phone in the bath read as rude. Prop the phone on something (tray, desk) instead. An extra limb must bend at the elbow out to the side, never hang straight down from the chest.
- **Piles and effects never clip the pet.** Check the cat in the busiest frame of every shot it is in.
- **A gag that reads as glitchy gets cut, not fixed.** Lewis cut the arm rising out of the clothes pile because it was unclear at 480p.
- **The gag must be visible at its moment.** Check the frame where it happens: gags were hidden behind another clone, buried inside a pile, or cut off at the frame edge. Move the gag on top or in front, pan the camera to it, or widen the shot.
- **Fire uses normal blending, not additive.** Additive flames wash out to white or pink. Keep smoke small, dark and above the faces, and keep fire lights at about 0.7 so the room doesn't turn orange.
- **Flames are tongues, not cones.** Use the shared lathed `FLAME` shape (several tongues plus a core) for every fire and exhaust. Cones read as traffic cones or white spikes. Fire lights are warm orange, short range (about 1m) and dim, or they turn faces pink.
- **Flashes and glows keep their colour.** An alarm light, a fireball or a sun halo that washes the frame pink or salmon is too strong or the wrong hue. Drop the strength and use true orange or yellow.
- **Nothing near the lens.** Clear rain, tiles and confetti from the camera's path (`clearNear` on piles, rain volumes set back from the camera), and never spawn particles at a character's mouth.
- **Moving sets never pass through characters.** When a set grows under someone (floors under the bust), lift what's on top first, then slide the new piece in. Hide body parts that should be inside the set (the bust's legs, hips and hands), so they don't dangle when it lifts.
- **Props don't intersect sets.** A saucer beside a tower sits clearly in front, fully in frame. Effects that cross faces (tiles, rings, beams) get re-routed or shrunk.
- **Signs and text stay readable.** Check signs aren't covered by a head, cropped at the frame edge or overlapping each other, and captions never cover key UI like a button.
- **Frame the whole group.** Work out the frame half-width at the subject's depth (`d·tan(fov/2)·9/16`) and keep every head inside it.
- **Cloud scenes use `ao: 0`.** AO punches dark holes into overlapping cloud spheres. Use enough clouds that the layer has no ragged gaps.
- **The item for sale reads as clothing.** Give it a garment colour (red), not grey, or it reads as a slab.
- **Ground near the camera needs detail at the right scale.** A huge sphere's texture blurs up close, so add a large detail decal under the action instead of relying on texture filtering. Anisotropy made no visible difference.
- **Rain is thin and faint.** Streaks about 0.006 wide at 0.26 opacity. Window rain is drawn as thin streaks; round dots read as snow.
- **Reactions bend the body.** A character ducking or cowering crouches: hips drop, knees bend, spine curls. Never tip the whole rig like a plank.
- **A gesture needs its object.** Someone clinging on grips a visible rail or handle at their hand.
- **Background characters keep their lanes.** Floaters, crowds and passers-by never cross behind the hero's head.
- **Effects aimed at the camera cover faces.** Rings, waves and bursts angle out along their source (a megaphone's horn), part-way toward the camera, and stay small.
- **Fireballs are round with a widening, faint trail.** A flat disc reads as a plate and a narrow bright cone as a spotlight.
- **Landed objects sink in slightly.** Never leave them hovering on the ground.
- **Swaying signs need room.** Size them so they don't overlap each other at the widest sway.
- **Rig gotcha:** `b.legL` and `b.legR` are plain objects, so hide `b.legL.hip`; the hips' own mesh is a separate child of `b.hips`.
- **Big set pieces stay in scale.** A Moon or planet is a huge sphere offset from the shot origin, so its edge curves. Move the camera, beams and lights by the same offset.
- **Canvas text fits its canvas.** BLOCKED at 130px overflowed a 512px stamp texture and "Would you take $2?" overflowed its bubble, so both showed cropped. Size the font to the canvas width, not the plane.
- **Clothing contrasts with skin.** A tan trench coat on a tan body read as bare skin. Pick a garment colour well away from SKIN and add a detail (buttons, belt) that says "coat".
- **Small flames vanish.** Candle flames under about 3.5cm wide disappear at room distance. Check them in the widest shot they appear in.
- **No light cones by the lens.** Additive spotlight cones near the camera wash the frame into white wedges. Drop them and let point lights do the work.
- **Effects contrast with what they cross.** A yellow ring on a yellow hoodie or sleeve vanishes; use white or red. A door the same green as the jumper in front of it swallowed him; recolour the set, not the hero.
- **Head rings go behind the head.** Camera-facing rings in front of a face read as bands across the torso; centre them just behind the head (about 0.3 back) at r 0.3–0.5 so they frame it like a halo.
- **No dust puffs on fabric or duvets.** Translucent puff spheres read as stains, blobs or grey balls. Cut them; a hit or a small spark does the job.
- **Point lights stay well clear of surfaces.** A light 0.1m above a desk turns the desk salmon even at intensity 0.1 (inverse square). Lift it, or use a hit instead of a coloured light.
- **Cameras stay inside the room.** A camera behind the back wall looks through the window, and the window rail becomes a white bar across the frame.
- **Falling props clear the edge.** Slide them fully past the desk edge before they drop and spin, or they sweep through it.
- **Stuck-on props get hidden in the other angle.** A phone parented to his head for the shoulder shot looked glued over his mouth in the front shot. Hide it per camera.
- **Hands leave the item after a tap.** A fist that stays over a phone hides the listing the shot is about. Lift it out to the side.
- **Rain and particles stop well short of the camera's end position**, not its start. A push-in brought streaks across the hero's face.
- **Flat cards in a pile face the camera.** Randomly yawed bubbles showed edge-on, upside down, and with squashed text on their rims. Give spew piles a yaw toward the camera and a plain material on the rims.
- **Pets keep one pose across a run of shots.** The cat sat in three different places in S1–S3; use one helper (`bedCat`) and place it where it is in frame but not in front of the hero or the item.
- **Labels never sit on other text.** Move a label off a sign or a lower-third, or change the camera's aim so the head drops clear of it.
- **Closed sets keep the camera inside.** A tank or room with walls on every side needs the camera inside the walls; widen the fov instead of backing out.
- **Poses set position, never add to it.** A pose branch that does `y += k` each frame without resetting y first drifts the character off the top of the frame.
- **Phone screens sit above the captions.** Captions sit at about 75% of frame height, so frame a phone insert with its key text and buttons above that line.
- **Clear the line of sight to the face.** A ring light on a tripod between the camera and the bed filled the hook shot. Before moving a camera, check what props sit between it and the face; go over them, not through them.
- **Faces read front-on.** A lying character shot from the side showed a profile at the frame edge. Put the camera on the side the face points to.
- **Held phones face the camera.** A phone turned side-on reads as a black stick. Turn every held phone toward the lens so its screen shows.
- **Foreground signs never cover set titles.** The "6 SLEEVES?" sign hid GALAXY FASHION WEEK. Project both into the shot and move the title up or the sign down until they clear.
- **Screen copy names the feature the voice sells.** The laptop button said "Messages" under "Or just get SaleLinx", ahead of a crosslist card. Make the button say the feature the next card shows.
- **Breath goes beside the head, never in front.** From a front-on camera, puffs ahead of the face land on the mouth and cheeks. Spawn them off the side of the head, small and faint.
- **Unused effects stay hidden.** A breath `dust` that a shot never animated still drew into the AO pass as a grey disc beside the couch. Effects start invisible until their first call.
- **Hats hide the hair.** Hair boxes poked through the beanie as brown blocks. Hide or shrink the hair under any hat.
- **Phone glows are cool and dim.** A warm point light on a held phone turned the holder's face pink.
- **Props follow the hand.** Place a held prop after the arm pose for that frame; the plug sat at his hip because it read the hand before `reachL` moved it.
- **Hands rest on what they touch.** Crawling hands lie flat on the ground (wrist rotated), not as pegs. Typing hands sit on the keyboards, above the desk top, never under it. A held phone being typed on has the thumbs on the lower half of its screen; `hold()`'s default grip sat below the phone and read as the phone floating above his hands.
- **Crowds sit below the hero's head.** From a high camera, distant crowd heads line up with a nearer hero's head. Lower the camera until the crowd sits under the horizon and the hero's head clears it.
- **Every camera change gets an edge check.** Re-aiming to show one thing cut the hero in half at the frame edge in two shots. After any camera edit, check the hero at the shot's first, middle and last frames.
- **Pop-ups over a head clear it.** A heart sat on the browser's head. Lift it clear and keep its whole rise inside the window frame.
- **Open mouths are maroon, and stop at the chin.** A brown mouth read as a beard. Cap `open` so a shout never runs past the jaw.
- **Raised props go in the hand on their cable's side.** A plug held at ear height read as a phone call, and on the far hand the cable crossed his face. Hold it overhead on the post side.
- **Kneel-to-stand bends the knees.** Straight legs with low hips read as a face-plant. Ease the knees from bent to straight and set the hip height from the knee angle.
- **Floor signs sit outside the caption band (74–84%), whole in frame.** Check both edges: fixing one side often cuts the other. Narrow the sign before panning the camera.
- **Trim fittings to the body's rounded corners.** A seam band as wide as a rounded torso stuck out as fins at the sides. A hood opening wider than the face showed the side of the head.
- **Nothing pokes out from behind the hero.** A ring member directly behind Jake showed only its phone, at his hip. Hide props on figures he covers.
- **No red caption words on red cards.** Red-on-red vanishes before the word is spoken. Drop the word from `hot` when its shot is a red card.
- **Place a gag for the shot's final camera.** Window fog on the right pane was cropped by the closing push-in, so it moved to the pane the end frame keeps. Hide a gag when it's done (the deflated puffer) rather than leaving a remnant.
- **Light beams over a character stay at about 0.08 opacity.** At 0.2, the additive choir beam washed the lowballer out.
- **Lower-thirds sit above the caption band** (y about 1250 on the 1080×1920 HUD), and check them against the captions in the assembled cut, not only in the clip.
- **Kit gotchas:** `G.sph` takes no phi arguments, so partial spheres (domes) use `THREE.SphereGeometry`. Store meshes you need later on the set (`g.frames`, `g.panes`) instead of finding them by float position.

## Phase 7: Voices

Run `node scripts/voice.mjs jobs/<id>`. It writes `line-<shot>-<n>.mp3` with `.json` word timings, plus the `sfx-*.mp3` files, into `remix/audio/`. It skips existing files, so move or delete a file to regenerate it.

- **Model:** `eleven_v3` is the only model that sounds human. `eleven_multilingual_v2` was called robotic.
- **Local voices are drafts only (Lewis, 12 Nov 2026, Reseller's House: "the voices sound really robotic").** Any cut Lewis will judge uses v3.
- **A two-voice ping-pong is one dialogue take (Lewis, 12 Nov 2026, Reseller's House: "the voices are still off").** Lines taken one at a time never hear each other, so they sound off. Send the whole script to ElevenLabs Text to Dialogue (`eleven_v3`, under 2,000 characters, output `mp3_44100_128` on this tier) with `node scripts/dialogue.mjs jobs/<id> <whisper.json>`. Its timestamps run short of the audio (83.3s on a 90.6s take), so it cuts at the pause between turns, found from whisper word times on the take (`whisper-cli -ml 1 -sow -oj`). Whisper every cut line before layout. Never cut pauses inside a line. Set `voice_at_speed: true`.
- **Copying our own post means its exact voices (Lewis, 14 Nov 2026, Price Drop Sunday: "copy the voices nand osund an animation").** Read the source take from the ElevenLabs history API (`GET /v1/history`, voices and tags in each item's `dialogue` entries) and reuse its voice ids, model, settings and tag style, even when they break the American rule. Set `voice_model` and `voice_settings` in shots.json; `dialogue.mjs` passes both. Our best performer (7706956131255536918) was `eleven_v4`, stability 0.4, similarity_boost 0.75, Thimsen and Northern Terry.
- **Copy the source's camera, not just its set.** That remix first went out with face close-ups and punch-ins; the source holds one medium shot (hair near the top, laptop lid just under the chin, poster and shelf in view) and barely moves. Match framing against the sheets shot by shot before the first full render.
- **One run, planned first (Lewis, 11 Nov 2026: "make sure we only do this once").**
  - Before any key is used, write `voice-plan.md`: the voice, the settings, the exact text of each take, the credits, and each line's slot against its expected v3 length.
  - Set `voice_chunks` so each story section is one v3 take (v3 is unstable on short lines). `voice.mjs` saves each raw take, cuts it into lines on the alignment, then speeds each line up (at most ×1.25) to fit its slot, or lengthens the shot past that.
  - Pick the voice from the free preview clips, not paid tests.
  - **Free checks before spending:** read the balance and confirm each voice ID (`GET /v1/voices/<id>` returns its name). Print the exact text each request will send, after `say` respellings and tags, and total its characters. A run costs about its character count: 889 characters cost 834 credits on the lowballer job.
  - **Make it reversible:** move the local voice files to `audio/local-voices/` and rename `local_voices` to `local_voices_off` in `shots.json`, so switching back means moving them back. Keep a raw copy of any line you edit afterwards, in `audio/el-raw/`.
  - Per-line takes also work: all 22 lowballer lines came back clean first time, the 2-word shouts included, and none needed a retake.
  - **v3 reads slower than the local voices.** Brian took about 0.38s a word in scene time, and number words take longer ("Thirty-seven…" ran 1.8 words a second). 9 of 22 lines overran their local-voice slots. Fix overruns for free, in this order:
    1. Pull the line's start earlier, to 0.05–0.1.
    2. Lengthen the shot and re-render it (rendering is free; check the held end frame).
    3. Speed up by at most 1.1, scaling the word timings to match.
    - Move a beat-synced line (a shake, a bass hit) only together with its event.
  - **Chunked takes (clear-out job, Nov 2026).** Four takes of 240 to 390 characters covered 31 lines, with no retakes; Lewis: "it's great". Daniel read at about 3.0 words a second, and the tag section slower (about 2.3), so 20 lines needed a speed-up and shots 26 and 27 grew about 1.1s each. 1,196 characters moved the balance by 834 credits.
  - **Re-render every 3D shot after any voice change,** not only the retimed ones. Labels and gags hang on word times via `say()`, which reads the line JSONs at render time. Times hard-coded in a scene (the tag's cursor `BEATS`) must match the line starts; `voice.mjs` prints any start it moves.
- **Polish pass on the voice (Lewis, 11 Nov 2026: "look for any weird cuts, the volume being off").** v3 alignment starts lines about 0.2s early after a pause, and a take stops mid-decay on its last word. So `voice.mjs` trims each line to its own sound (skipping the breath), stretches the words over it, and gives a take's last line a 0.12s fade. `assemble.mjs` levels each line on its speech only, or short lines come out about 2dB loud. Then check every line's edges, levels within 0.5dB, gaps between lines, momentary-loudness spikes, and whisper the mix in sections of about 15s (on the whole film it stops partway).
- **Voice choice:**
  - The account is on Starter, so library voices work as well as premade ones (on the free plan they returned 402).
  - The current cast: **Chris** (`iP95p4xoKVk53GoZ742B`) narrates and **Jessica** (`cgSgspJ2msm6clMCkdW9`) is the sceptic, both American.
  - **British narrator:** match the source's accent. **Daniel** (`onwK4e9ZLuTAKqWW03F9`, premade "Steady Broadcaster") read the dry British clear-out monologue with no tags, letting the full stops carry the deadpan; Lewis: "it's great".
  - **Documentary narrator:** **Brian** (`nPczCjzI2devNBz1zQrb`, deep, middle-aged American) narrated the nature-documentary lowballer job, with Chris as the hero Jake. Lewis: "it's great".
  - Delivery that worked on v3: `[appalled]`, `[annoyed]`, `[shouts]` and `[mischievously]` on the hero's short reactions. For a weighty two-word line, use an ellipsis rather than a tag ("You're... prey.").
  - **Local voices are drafts only (Lewis, 12 Nov 2026, Propbar: "the audio is really grainy and not well mastered and the voice sound weird, use the best sounding voices").** The OmniVoice `tr-us-*` takes sound grainy in the finished mix. For any cut Lewis watches as a near-final, use the ElevenLabs v3 cast (Chris and Jessica). Two voices means one take per line, because `voice_chunks` only voices the narrator.
  - **Chris reads calm (Lewis, 12 Nov 2026, Propbar: "why does he scream all of it").** At stability 0.5 with no tag, v3 reads short ad lines as a hyped announcer. Voice the narrator at stability 1.0 with `[calm]` at the start of each line; `words()` skips the tag. The calm takes run about 10% longer, so check every slot.
  - v3 ignores the `speed` voice setting (Propbar, Nov 2026: takes at 1.15, 1.0 and 0.85 all ran about 2.2s). To slow a fast take, retake it, then use atempo, at 0.88 or above.
  - Rejected: Will (v3) "sounds weird"; Liam (v2) "sounds robotic"; the local VoiceStudio *designed* voices sounded off.
  - **Local pick (Nov 2026):** from 10 VoiceStudio samples Lewis chose the cloned profile **tr-boy**. To choose, render one line in every profile into numbered files and let him listen.
  - **Every voice must be American** (Lewis, 12 Nov 2026). `tr-boy`, `tr-girl`, `tr-girl2` and `tr-mentor` are British clones; use `tr-us-boy` (narrator), `tr-us-girl` (sceptic), `tr-us-girl2` and `tr-us-mentor` instead: `local_voices: {"narrator": {"model": "omnivoice", "voice": "tr-us-boy"}, "skeptic": {"model": "omnivoice", "voice": "tr-us-girl"}}`.
  - **American voices only (Lewis, 12 Nov 2026: "make sure the voices are all american").** Use the `tr-us-*` profiles (`tr-us-boy` narrates). Write American words to match: "Mom", not "Mum", in lines, captions and on-screen text. The US clone reads "Depop" as written; keep `Vin-ted`, `re-list`, `cross-lists` and `hi-viz` → `high-vis` in `say`.
  - **Final-speed voice:** set `"voice_at_speed": true` with `speed`, and `voice.mjs` asks VoiceStudio for each line at the film's final pace, so `assemble.mjs` never time-stretches speech (atempo left a warble). Word timings stay in scene time. `pace` 0.31 gives about 3.5 words a second after the speed-up.
  - **Must-hear check:** a line's `"hear"` regex is matched against whisper's text, and up to 8 takes are tried until it passes. Use it on brand-name lines.
  - **If the VoiceStudio app exits on launch** (it did on 11 Nov 2026, silently), start its backend directly: `cd ~/Library/Application\ Support/VoiceStudio/runtime/project/backend && ../.venv/bin/python -m uvicorn main:app --port 3900`. `voice.mjs` only needs that API.
  - **Pace (Lewis, Nov 2026: "very slow and has pauses a lot, it needs to be a good fast paced tiktok"):** the voice runs almost back to back, at about 0.5 to 1 s between lines, read at a natural 3.3 to 4 words a second (over 4.2 sounds rushed: shorten the line, never speed it) (`dur` ≈ 0.27 s per word + 0.2). No stretch longer than about 3 s goes without voice; give the big action shots a short line too. A 3D shot is about 2 to 3 s long, not 4 to 7.
  - **Retiming rendered shots:** keep the rendered clip, then set `src` to its rendered length, `dur` to the new slot and `fit: "speed"`. The overlays are baked into the clip, so they speed up with it. Scale each sfx `at` by the same ratio. render3d still renders at `src`.
  - Each line sits inside its on-screen text beat. A film that already shows its own text sets `caption_style: {"off": true}`.
  - For the local clones only, respell `Vinted` as `Vin-ted` in `say`, or they read "Vint had". On v3, leave it as written (see Pronunciation).
- **Use more than one voice.** A dry narrator plus a sceptic who pushes back keeps the piece interesting.
- **Emotion tags** go at the start of a line:
  - Tags: `[excited]`, `[sarcastic]`, `[sighs]`, `[curious]`, `[mischievously]`.
  - Use them on the catchphrases.
  - They can make a voice drawl. `[curious]` and `[sarcastic]` on Jessica added 1 to 2 seconds.
- **Pronunciation:**
  - The `say` map respells brand names for the voice ("SaleLinx" → "Sale Links").
  - Captions keep the real spelling, because `voice.mjs` maps the words back.
  - Whisper will still hear "Sale Links" and "Deepop"; check by ear. The base model also hears "Vinted" as "vintage", "sink" as "sync", "read" as "red" and "bath" as "bar", so don't retake on those alone; flag them for Lewis to check by ear.
  - On v3 a hyphen respelling can leave a gap inside the word: "Vin-ted" came back as "Vin…ted", with 0.14s of silence. Find it with `silencedetect=n=-35dB:d=0.06` inside the word's timing, cut about 0.1s of it, and shift the later word timings.
- **Pauses:** `voice.mjs` cuts every pause in a v3 line to 0.28 seconds and shifts the word timings to match.
- **When a line is too long for its shot,** in this order:
  1. Retake it without the emotion tag (about 60 credits).
  2. Speed it up with `ffmpeg -af atempo=1.2` (at most 1.2), dividing the word timings in the JSON by the same factor.
  3. Lengthen the shot.
  - `voice_settings.speed` barely changes v3.
- **Retiming,** after every regeneration:
  - Start values: `at` = 0.05 for the first line of a shot. A split second line sits at about 0.65 to 0.75, at least 0.12 seconds after the previous line's speech end. Speech end is the last word's `end` in its JSON.
  - Walk the whole timeline across shots, pushing each start later where needed. Screen card `dur` = max(3.6, at + speech + 0.4).
  - Report any shot whose speech runs more than 0.3 seconds into the next shot, and fix the big ones.

## Phase 8: Sound

- **One effect per visible event.** Clunks, whirrs, pings, smashes, whooshes on whips, a sparkle on twinkles.
- **Prompts are concrete:** "big cartoon hammer smash with plastic crunch", not "impact".
- **Ambient beds** (rain, factory hum) loop with `"for"`.
- **Reuse files** for repeated events (whooshes, sparks) instead of generating new ones.
- **Mixing is automatic in `assemble.mjs`:**
  - Speech is levelled per line and the effects are ducked under it.
  - Voice chain, kept light (Lewis, 12 Nov 2026: "the voices are still off"): highpass 80, −1.5dB at 250Hz, a light de-esser and one 2:1 compressor with a 15ms attack. ElevenLabs takes arrive mastered; the earlier chain (EQ boosts, a 6:1 catcher, a 0.4 limiter per line) cut their peaks 7dB and made them sound off. It runs on each line on its own, and each line is matched to −19 LUFS after it (Propbar, 12 Nov 2026): run on the summed bus, lines landed 4dB apart.
  - Even voices with `voice_trim` per voice (Jessica −2.6 under the light chain) and `trim` per line. Judge a line by its peak momentary loudness; a line with a pause in it averages low.
  - Effects bus: −2dB shelf at 7kHz and a light compressor; ducking is 5:1 with a 300ms release.
  - No in-graph loudnorm (its dynamic mode pumped). The master is a measured gain, re-measured three times through one soft limiter (0.7, asc) run at 192kHz so it catches peaks between samples, then AAC at 256k. Never stack limiters: two at 0.7 and 0.75 held every syllable at the ceiling and made the voice grainy. The mix is held as ALAC until the master, so AAC runs once.
  - The target is −14 LUFS with true peak at or below −1.5 dBFS.
  - Never use `areverse` in the mix graph; it silences the whole output.
  - Looped beds need `asetpts=N/SR/TB` before `atrim`; mp3 loop timestamps drift and cut the bed short.
- **Sound polish pass (lowballer, Nov 2026), with no new generation:**
  - `assemble.mjs` gives every line an 8ms fade in and a 60ms fade out. v3 ends a file on its last letter at about −25dB, which was an audible chop on 16 of 22 lines.
  - Scan the mix's momentary loudness with `ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=m.txt` and map the spikes and gaps to the sfx and lines at those times.
  - Fill any gap over 0.5s: a text card held after its line went silent, so a low `lib-wind` bed now runs under it.
  - Keep clicks under narration at about 0.35. At 0.5 they spiked over the voice.
  - Lines should land within about 1dB of each other after levelling, with shouts about 1.5dB louder.
  - With the light chain, the limiter at 48kHz let true peak reach +0.6dB; at 192kHz it lands at about −1.9dB.
- **Lewis wants the mix "crisp and soft"** (Unsold Bag, Nov 2026): voice high-passed, de-essed, air on top, gentle compression; effects shelved down above 7kHz and squeezed together; a soft-clip limiter.
- **Normalize every effect before setting volumes.** Unsold Bag effects ran from −36 to −3 LUFS peak momentary, so a vol of 0.5 meant nothing. Bring each to −18 with a 4ms fade-in and trim long tails, then set vol by category: impacts 0.8–0.9, texture 0.3–0.45. Swap any file whose raw level is near silent rather than boosting its noise.
- **Pick local voice takes by score.** Render six seeds per line and transcribe each; keep the take with the best word match, then the highest token confidence. Replace the current take only when it mishears a word or scores clearly higher, then re-sync that shot's sfx to the new word times.
- **Music:** the ElevenLabs API refuses music on free keys. Ship without music, so the trending sound gets added in-app when posting. Name the source's track (`info.json`) in the delivery reply so Lewis adds the same one.
- **The API key has no `sound_generation` permission (14 Nov 2026).** New effects are synthesised locally with ffmpeg, or taken from the library.

## Phase 9: Render and assemble

- **Iterate at 480p:**
  - `node scripts/render3d.mjs jobs/<id> [shot ids] --lo`, then `node scripts/assemble.mjs jobs/<id> --lo`, which writes `out/video-lo.mp4` at 480x854.
  - Re-render only the shots you changed.
- **Quick look:** `--preview` writes three frames per shot (at 10%, 50% and 90%) to `remix/preview/`.
- **Exact moments:** the 10/50/90 samples miss moments, so pull those frames from the clips and tile them into one contact sheet, then read it:
  ```
  ffmpeg -ss <t> -i remix/clips-lo/NN.mp4 -frames:v 1 -vf scale=270:-2 <scratch>/NN_t.jpg
  ffmpeg -pattern_type glob -i '<scratch>/*.jpg' -vf tile=8x1 -frames:v 1 sheet.jpg
  ```
- **Whole-video sheet:** `ffmpeg -i out/video-lo.mp4 -vf "fps=1/3,scale=160:-2,tile=9x3" -frames:v 1 sheet.jpg`.
- **Check every build:**
  - resolution (`ffprobe`)
  - duration
  - loudness (`ffmpeg -af ebur128=peak=true`)
  - a whisper transcript of the voice track
  - the contact sheet, read frame by frame, captions included
- **Final:**
  - `node scripts/render3d.mjs jobs/<id>`, then `node scripts/assemble.mjs jobs/<id>`, which writes `out/video.mp4` at 1080x1920.
  - Only when Lewis asks for 1080p. Copy it to `~/Desktop/<brand>-<idea>-remix.mp4`.
  - **4K, when asked:** run `render3d.mjs jobs/<id> --4k`, then `assemble.mjs jobs/<id> --4k`. This writes `remix/clips-4k/` and `out/video-4k.mp4` at 2160×3840. The captions and end card are drawn at 2× in `cards-4k/`, not upscaled.
    - It takes 15 to 25 minutes for 70s of scene, so run it in the background. The lowballer file was 544MB; the clear-out file (76s of scene) took 25 minutes and was 1.0GB.
    - Check a full-resolution crop for sharpness before delivering.

**Shell traps (zsh):**

- Variables don't word-split, so write loops as `bash -c '...'`.
- A glob that matches nothing aborts the whole command.
- This ffmpeg has no `drawtext`.
- `-frames:v N` without an output pattern fails, so use a tile filter.
- `afade` straight into `libmp3lame` can fail with "inadequate AVFrame plane padding"; put `aresample=44100` after the fade.
- Long renders go in the background; don't poll them.

## Phase 10: Improvement rounds

After the first full cut, run these rounds without waiting to be asked. Each round:

1. Write the list to `jobs/<id>/improvements-N.md`.
2. Do every item.
3. Re-render only the shots you touched.
4. Check each fix in a frame at the moment it happens.

The rounds:

1. **Fifty improvements** across pacing, framing and light, characters, props and sets, voices, sound and story. Concrete items only, e.g. "Shot 7: head nods land on Depop, Vinted and eBay"; never "improve lighting". See `notes/improvements-2.md` for the grain.
2. **Spectacle:** give every shot its special moment (Phase 6) so the video is visually entertaining from start to finish.
3. **Inconsistencies:** go through every shot hunting for anything that looks off or strange:
   - **Physical:** clipping, disconnected parts, a blocked camera, unreadable props.
   - **Continuity:** objects that move between shots.
   - **Captions:** wrong spellings.
   - **Timing:** lines overrunning their shots, dead air.
4. **Pace:**
   - Aim for roughly the source's runtime.
   - Trim dead tails, then set `speed` (1.1 took 81s to 73.6s and felt right).
   - Sync is kept because the speed-up is applied after captions and audio are placed.
   - It must be a quick TikTok that keeps people watching. Clone Army needed 1.2x, every shot ending about 0.2s after its last word, and cuts to any shot that repeats the previous joke or is a pause with no new turn. That took it from 69s to 47s.
   - Something new must happen within the first 0.3s, and the hero's face must be on screen within 2s.
   - When adding beats later, re-total the runtime before quoting it; `shots.json` durations are in scene time, so divide by `speed`.

5. **One hundred improvements, on the finished video.** Once rounds 1 to 4 are done and the cut is complete, watch it end to end, frame by frame at every beat, and list 100 concrete improvements across every area: story clarity, each beat's picture-to-text match, characters and anatomy (hands, arms, poses must look natural), framing, light, sets and props, motion and physics, transitions, captions and HUD, sound and mix, pace, the end card. Do all 100, re-render, then check each fix in frame. This round is mandatory on every job; the video doesn't go to Lewis until it's done.

6. **Polish rounds** ("look for anything weird or off, do 100 polishes"):
   - Hunt with full-resolution single frames (`z.sh`), not only tiled sheets. Tiles butt neighbouring frames together and fake overlaps at the edges.
   - Check every Phase 6 continuity rule on every shot, then re-check each fix after rendering; a fix often creates the next problem (a saucer moved in front then crossed his face).
   - The 100 are real changes only. No checks, no restatements of another item, nothing "kept as is". If short, keep hunting rather than padding.
   - Re-render any shot edited while a render was already running.
   - Don't fix a caption clash by moving the caption over a panning screenshot; the pan carries the UI under it.
   - Re-check camera changes that rely on a phone's normal or `up`: tilting a held phone flatter flipped a normal-following close-up upside down.
   - A word-regex sfx can match a word that already has one; check the shot's sfx list for a duplicate at that time.
   - For ffmpeg `-ss` times use `awk` printf, not `bc` (`bc` drops the leading zero and ffmpeg rejects ".76").

Keep `jobs/<id>/fix-notes.md` short. It lists only what you couldn't fix, and why.

## Phase 11: Deliver (gate 2)

Open the 480p cut for Lewis. Reply in a few lines:

- **Voices:** what changed, including any free-plan limits that affected the choice.
- **Fixes:** the main ones.
- **The output:** its path, duration and loudness.
- **Credits:** used and remaining.

Every time a cut is built, copy the 480p `out/video-lo.mp4` to the Desktop without being asked, as `~/Desktop/<brand>-<idea>-remix-<what changed>-480p.mp4` (Lewis, 11 Nov 2026: "keep putting them in desktop for me to watch"). Never overwrite an earlier cut's file. Render 1080p only when he asks for it.

- Give each new cut a new Desktop name that says what changed (`-gags`, `-features`, `-elevenlabs`, `-polished`, `-4k`), and open it in QuickTime. Earlier cuts stay, so he can compare.
- Lewis reviews by watching the 480p and sending voice notes, which transcribe roughly ("Cholobuller" means lowballer). Read them for intent.

**The order that worked (lowballer job, Nov 2026):**
1. Script.
2. Build with free local voices.
3. 100 improvements.
4. 10 gags.
5. Lewis's watch notes.
6. One planned ElevenLabs run.
7. Free retiming and a sound polish.
8. 4K render.
9. Description.

Keep paid voices until the picture and timing are locked, so they are generated once.

The bar is set by the reference job's final cut:

- 21 beats in 73.6 seconds
- two human-sounding voices with the narrator's catchphrases
- a special moment in every shot
- no physical inconsistencies
- captions that match the words exactly
- a real-screenshot tag and a compliant end card
- −14 LUFS
