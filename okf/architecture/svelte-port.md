---
type: Guide
title: Svelte Rewrite Guide
description: How to rebuild Letter Leap in SvelteKit 2 + Svelte 5 with behaviour parity — target layout, React→Svelte mapping, pitfalls, acceptance checklist
resource: src/
tags: [svelte, sveltekit, migration, guide]
timestamp: 2026-10-05T19:13:38Z
---

# Target stack

SvelteKit 2 + Svelte 5 (runes) + TypeScript + Tailwind + `@sveltejs/adapter-static` (output `out/`) + `@lucide/svelte`. shadcn-svelte is optional: only card, button, table, scroll-area and toast are needed, and plain Tailwind markup is fine.

# Suggested layout

```
src/
  app.html, app.css              # from globals.css (see Theme)
  routes/
    +layout.svelte               # MainLayout + toaster
    +layout.ts                   # export const prerender = true; ssr optional
    +page.svelte                 # Game Hub
    games/letter-leap/+page.svelte
  lib/
    words.ts                     # LANGUAGES, WORDS_BY_LANGUAGE, PRAISE, hand keys (copy verbatim)
    speech.ts                    # speakWord() — framework-free
    storage.ts                   # load/save sessions + language
    game.svelte.ts               # createGame(): $state + actions + timers
    components/WordDisplay.svelte, HandIndicator.svelte, CurrentStats.svelte,
               GameControls.svelte, SessionStats.svelte, PraiseBubble.svelte
```

# Concept mapping

| React (now) | Svelte 5 |
|---|---|
| `useLetterLeapGame` hook | `createGame()` in `game.svelte.ts`, returning a `$state` object plus methods |
| `useState` | `$state` |
| derived values in render (`activeHand = wordHidden ? null : …`) | `$derived` |
| `useEffect` timers (700 / 2000 / 2200 / 4000 ms) | Prefer **direct `setTimeout` in the action that causes them**, with ids kept and cleared in `endSession`/`destroy`. `$effect` with a cleanup return also works and mirrors React 1:1 |
| `useCallback` / deps arrays | not needed |
| `useRef` (hidden input) | `bind:this` |
| `window.addEventListener('keydown', …, true)` in an effect | `<svelte:window onkeydowncapture={…}>` |
| `"use client"` + `typeof window` guards | `onMount` / `browser` from `$app/environment` |
| `next/link` | `<a href>` |
| `next/font` Geist | `@fontsource-variable/geist` |
| `output: 'export'` | `adapter-static` + `prerender = true` |
| `useToast` + Toaster | `svelte-sonner`, or a 10-line custom toast |
| lucide component stored in state (`praiseIcon`) | store the praise index; render `<svelte:component this={PRAISE[i].icon}>` or `{@const Icon = …}<Icon/>` |

# Simplifications to make during the port

* Replace the flag soup with `phase: 'start' | 'listening' | 'typing' | 'praise'`. See [Game Loop](/architecture/game-loop.md).
* Drop `currentLevel` and the Level card, the `'timeout'` feedback, the unused constants, the dark palette (unless wanted), and genkit/firebase/react-query/etc.
* Compute accuracy and WPM as `$derived`, not stored state. Keep the WPM-on-keypress semantics, or tick every second; either is fine.
* `typedWordPortion` is redundant (`word.slice(0, index)`).

# Pitfalls (each has bitten the React version)

1. **The first `speak()` must run synchronously inside the Start click.** Never put it behind `await`, `setTimeout` or `$effect`. See [Speech](/concepts/speech.md).
2. Don't call `speechSynthesis.cancel()` right before `speak()` unless something is speaking.
3. Pick the voice explicitly; keep the 4 s reveal fallback.
4. Cancel the praise and next-word timers on End Session, or a word appears on the start screen.
5. Ignore keys while listening and during praise.
6. Use `preventDefault` on letter keydowns so the hidden input doesn't double count.
7. Don't touch `localStorage`/`speechSynthesis` during prerender.
8. Keep the localStorage keys `letterLeapSessions` / `letterLeapLanguage`, so history survives the migration.

# Acceptance checklist (parity)

- [ ] `/` shows the Letter Leap card and links to `/games/letter-leap`.
- [ ] Language toggle persists across reloads; Dutch words use an `nl` voice.
- [ ] Start → "..." with no hand lit → word spoken → word appears with the correct hand lit.
- [ ] Correct letter: green pulse, next letter grows, hand updates. Wrong letter: red pulse, vibrate, streak reset.
- [ ] Last letter → praise bubble about 2 s → next word spoken about 0.2 s later.
- [ ] Mid-word or mid-praise End Session → toast, start screen, "Play Again", new row at top of Past Sessions, no stray word appears later.
- [ ] Past Sessions keeps 10 rows, newest first, with relative dates.
- [ ] Mobile: soft keyboard opens on Start and letters register once each.
- [ ] `npm run build` writes `out/`; the Firebase deploy works unchanged.

# Citations

* Derived from every file listed in [Architecture Overview](/architecture/overview.md).
