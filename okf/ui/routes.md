---
type: Concept
title: Routes
description: Two static routes — the Game Hub at / and the Letter Leap game at /games/letter-leap — with their render rules
resource: src/app/
tags: [routes, pages]
timestamp: 2026-10-05T19:13:38Z
---

# Root layout (`src/app/layout.tsx`)

* `<html lang="en" suppressHydrationWarning>`. The `<body>` also has `suppressHydrationWarning`, because browser extensions inject attributes.
* Geist Sans and Geist Mono via `next/font/google`, exposed as CSS vars `--font-geist-sans` / `--font-geist-mono`.
* Wraps children in `<Providers>` (an empty pass-through) and renders `<Toaster/>` once.
* Metadata title/description: set them in SvelteKit via `<svelte:head>`.

# `/`: Game Hub (`src/app/page.tsx`)

`MainLayout title="Game Hub"` → heading "Choose a Game" → a responsive grid (1/2/3 columns) containing **one card**:

* Title "Letter Leap" with a `Keyboard` icon.
* Description "Master the art of typing words, one leap at a time!"
* A decorative inline SVG (wavy lines and rectangles in theme colours).
* Footer link text "Play Typing Game →".
* The whole card links to `/games/letter-leap`.

A single game sits alone in a 3-column grid. Consider centring it, or linking straight to the game, in the rewrite.

# `/games/letter-leap` (`src/app/games/letter-leap/page.tsx`)

`MainLayout title="Letter Leap"`. Render order, top to bottom:

1. **Start card**, if `showStartScreen && !isPlaying`:
   * "Welcome to Letter Leap!", a description, and the language toggle (English / Nederlands).
   * Hint text: "The game will speak the word. Listen carefully and type what you hear."
   * This copy is too wordy for non-readers; it could be simplified.
2. **Praise bubble**: absolutely positioned above the content when `showPraiseMessage`.
3. **Game area**, if `!showStartScreen`:
   * Row: [left hand box] [WordDisplay] [right hand box].
   * Below it, `CurrentStats` (5 cards).
   * `activeHand` and the word are forced to null while `wordHidden`.
4. **Hidden input** for mobile (always rendered, off-screen).
5. **GameControls**:
   * "Start Typing" or "Play Again" when on the start screen or after a session, and not playing.
   * "End Session" (destructive variant) while playing.
6. **SessionStats**: the past-sessions table. It is always visible, including during play.

Detailed behaviour: [Game Loop](/architecture/game-loop.md).

# Static export

`next build` with `output: 'export'` produces `out/index.html` and `out/games/letter-leap.html` (no trailing slash). Firebase rewrites `**` → `/index.html`. See [Build & Deploy](/config/build-and-deploy.md).

# Citations

* `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/games/letter-leap/page.tsx`.
