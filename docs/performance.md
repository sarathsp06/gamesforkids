# Performance: what was measured and what changed (October 2026)

Measured on the production build, served locally, in Chrome with DevTools' **Slow 4G** (150 ms, 1.6 Mbps)
and a 4× slower CPU: a cheap tablet on a weak connection. Median of 3 runs. `scripts/bundle_report.py`
prints each page's JavaScript and CSS cost from the build; the browser scripts used are described at the end.

## Before → after

| | Before | After |
|---|---|---|
| **Tap a game tile → game on screen** | 1.5–2.0 s | **0.08 s** |
| Bytes fetched on that tap | 75–94 kB | 0 (already loaded while home was shown) |
| Spell Pick, first visit, bytes | 206 kB | **130 kB** |
| Paint Pot, first visit, bytes | 205 kB | **128 kB** |
| Game page JavaScript (gzip) | 138–142 kB | 72–79 kB |
| Small print page JavaScript (gzip) | 62 kB | 35 kB |
| CSS on every page (gzip) | 14–17 kB | 1.5–5 kB |
| Second visit | ~35 requests re-checked with the server | answered from the device |

Time until a page first shows its content on a cold first visit did not change (~1.5 s locally): it is set
by round trips for the page's ~24 script files, which the local HTTP/1.1 server serves six at a time;
GitHub Pages uses HTTP/2.

### On the live site (GitHub Pages, same throttling, real internet)

| | Before | After |
|---|---|---|
| Tap a game tile → game on screen | 1.58–2.11 s | **0.07–0.08 s** |
| Spell Pick, first visit | 205 kB, content at 2.57 s | 128 kB, 1.54–2.06 s |
| Paint Pot, first visit | 221 kB, 2.57 s | 144 kB, 2.56–2.58 s (now includes painting together) |
| Home, first visit | 159 kB, 2.57 s | 211 kB, 1.55–2.07 s: the extra is every game's code, loaded so taps are instant |

First-visit times vary by about half a second between runs over the real internet; the ranges are the
medians of two sets of three runs.

## What made the difference

1. **The tap no longer waits for Pip.** Home used to say the game's name and only start loading the game
   when the voice ended (clip download + 1 s of speech + then the game's code). Tiles are now links that open
   at once while Pip keeps talking, and each game's code is loaded while the home screen is on display.
2. **A moving band at the top answers any page change** that takes more than 120 ms.
3. **Emoji were inlined into the JavaScript.** Vite turns files under 4 kB into `data:` URLs, so all 90
   sticker and scene pictures (59 kB gzip) rode along with every game. They are now plain files in
   `static/emoji/`, fetched only when shown.
4. **Fonts.** Only Latin Andika and Fredoka (every English and Dutch letter). The Cyrillic, Greek and
   Vietnamese `@font-face` rules are gone from the CSS, and, a trap worth knowing: Fontsource's per-subset
   files carry no `unicode-range`, so importing `latin-ext` downloaded 160 kB of fonts on every page.
5. **What every page carries.** The app shell imported the sound switches from the audio module (with the
   1,360-entry voice list) and level counts from the game modules (with every fable). Those constants now
   live in tiny modules (`sound.ts`, `limits.ts`), and the generator's full line list is in
   `voice-catalog.ts`, not in the `i18n.ts` every page uses.
6. **A service worker** keeps files on the device as they are used: scripts, styles and fonts until the next
   deploy; voice clips and emoji for good. Nothing is fetched ahead, so a first visit on a metered connection
   costs only what the child opens. Pages are asked from the network first and fall back to the stored copy.

## Considered and not done

- **An emoji web font from a CDN** (Noto Color Emoji via Google Fonts): measured at 209 kB and 1.4 s for
  eight stickers, against 12 kB and 0.3 s for the same eight as SVG files. Safari (iPads) can't show that
  colour-font format, and every visit would contact Google.
- **Loading the voice list on demand** (12.5 kB gzip on game pages): about 65 ms on Slow 4G, and the first
  prompt would risk the browser voice. Not worth it.
- **Fetching the whole app in the service worker at install**: doubled the first visit's download.

## How it was measured

Playwright (Chrome for Testing) with the DevTools protocol for network and CPU throttling. Cold loads use a
fresh profile; second visits reload in the same profile; taps load home, wait until it is idle, click a tile,
and time the first change on screen, the address change, and the game's own screen. Byte counts are taken
with the service worker blocked, since its fetches are not visible to the page's own network log.
