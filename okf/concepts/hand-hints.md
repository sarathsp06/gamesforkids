---
type: Concept
title: Hand Hints & Feedback
description: Visual cues for non-readers — which hand to use (QWERTY split), green/red letter flashes, vibration on error, praise bubble with icon
resource: src/lib/constants.ts
tags: [feedback, ux, kids]
timestamp: 2026-10-05T19:13:38Z
---

# Hand indicator

Two boxes flank the word. The box for the hand that should press the **next** letter lights up orange (accent colour, glow, scale 1.05) and shows a lucide `Hand` icon; the other box is dimmed (opacity 0.5, scale 0.9).

QWERTY split (it covers all 26 letters):

* **Left:** `Q W E R T A S D F G Z X C V B`
* **Right:** `Y U I O P H J K L N M`

`activeHand` is set to the hand for the first letter on a new word, and to the next letter's hand after a correct press. After a wrong press it stays on the target letter. It is null when the word is complete, and hidden (null) while the word is being spoken.

# Letter feedback

* **Correct press:** the word box pulses pale green (`feedback-correct`, 0.5 s) and the border turns green.
* **Wrong press:** the box pulses red (`feedback-incorrect`), the current target letter turns red and re-animates, and `navigator.vibrate(100)` fires (on Android; it's a no-op elsewhere).
* Feedback clears after 700 ms.

# Word rendering

Each letter is a span:

* **Current target:** `text-7xl/8xl`, primary colour, scale 1.25, `animate-letter-appear`.
* **Already typed:** foreground colour, full opacity, `text-4xl/5xl`.
* **Not yet typed:** muted, opacity 0.7, `text-4xl/5xl`.

When there is no word (speaking, or between words before the next one), the box shows grey "...".

# Praise

On word completion, one of these is picked at random and shown in a bubble above the word with a pop animation (`animate-praise-pop`, 0.4 s, overshoot curve) for 2 s:

| Text | lucide icon |
|---|---|
| Wow! | Sparkles |
| Yes! | ThumbsUp |
| Super! | Star |
| Woohoo! | Award |
| Yay! | PartyPopper |
| Nice! | ThumbsUp |
| Sweet! | Sparkles |

# Citations

* `LEFT_HAND_KEYS`, `RIGHT_HAND_KEYS` and `PRAISE_MESSAGES` in `src/lib/constants.ts`; `src/components/word-display.tsx`; `src/app/games/letter-leap/page.tsx`; `.hand-indicator-visual` in `src/app/globals.css`.
