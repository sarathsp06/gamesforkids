---
type: Concept
title: Input Handling
description: Two input paths — window keydown (capture phase) for physical keyboards and an off-screen text input for mobile soft keyboards — both funnel into handleKeyPress
resource: src/hooks/use-letter-leap-game.ts
tags: [input, keyboard, mobile]
timestamp: 2026-10-05T19:13:38Z
---

# Gate (both paths)

Input is ignored unless `isPlaying && !isSessionOver && currentWord && !wordHidden`. `handleKeyPress` additionally ignores presses once the word is complete (during praise).

# Path 1: physical keyboard

`window.addEventListener('keydown', handler, true)` (**capture phase**):

1. If `event.code` matches `/^(Key[A-Z]|Digit[0-9])$/`:
   * `preventDefault()` and `stopImmediatePropagation()`. This stops browser shortcuts and find-as-you-type, and, because default is prevented, the hidden input receives no `input` event, so there is no double count.
   * If no Ctrl/Meta/Alt is held (Shift is fine) and `event.key` is a single letter → `handleKeyPress(event.key)`. Digits are swallowed.
2. All other keys (Space, Enter, Tab, F‑keys, punctuation) pass through untouched.

The check uses `event.code` (physical key) for blocking and `event.key` (character) for the game, so AZERTY layouts still produce the right letter.

# Path 2: mobile soft keyboard

* `<input id="hidden-input-for-mobile" type="text">` is positioned at `left/top: -9999px`, 1×1 px, opacity 0.
* It is focused on `startGame` and `showNewWord` (this opens the on-screen keyboard), and blurred on `endSession`.
* On its `input` event: take the **last** character of `value`; if it is a letter → `handleKeyPress`; always reset `value = ""`. When gated, the value is cleared too.
* Mobile keyboards usually send `keydown` with `code` "" (key 229), so path 1 doesn't fire and nothing is double counted.

# Case

Comparison is `key.toUpperCase() === currentWord[index]`; the words are uppercase.

# Svelte note

Use `<svelte:window onkeydowncapture={...} />` (Svelte 5) or `addEventListener` in `onMount`, and `bind:this` for the hidden input. Keep the capture phase and `preventDefault`.

# Citations

* The keyboard `useEffect` (`handleKeyDown`, `handleHiddenInput`) in `src/hooks/use-letter-leap-game.ts`; the hidden input in `src/app/games/letter-leap/page.tsx`.
