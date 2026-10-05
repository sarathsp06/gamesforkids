---
type: Concept
title: Scoring
description: Accuracy, WPM, streaks and word count — live formulas and the SessionStats record written at session end
resource: src/hooks/use-letter-leap-game.ts
tags: [scoring, stats]
timestamp: 2026-10-05T19:13:38Z
---

# Live stats (recomputed after every accepted press)

| Stat | Formula | Display |
|---|---|---|
| Accuracy | `correctPresses / totalPresses` (0 if no presses) | `(acc*100).toFixed(1)%` |
| WPM | `round((correctPresses / 5) / elapsedMinutes)`; elapsed = now − `gameStartTime` (includes listening and praise time) | integer |
| Streak | +1 per correct press, reset to 0 on a wrong one | `"{current} (Max: {longest})"` |
| Words | +1 when the last letter of a word is correct | integer |
| Level | constant 1 | integer (dead; drop it) |

WPM uses the standard "5 characters = 1 word" convention, not `wordsTyped`. WPM only updates on key presses, not on a clock tick.

# Session record (`SessionStats`, on End Session)

```ts
{
  id: new Date().toISOString() + Math.random().toString(16).slice(2),
  date: new Date().toISOString(),
  accuracy: +(acc * 100).toFixed(2),      // percent, 2 decimals
  wpm: Math.round((correct / 5) / durationMinutes),   // 0 if duration 0
  lettersTyped: correctPresses,
  wordsTyped,
  durationMinutes: +durationMinutes.toFixed(2),
  longestStreak,
}
```

Then it is prepended to the history, which is trimmed to 10 and saved (see [Persistence](/concepts/persistence.md)). A session is recorded even when nothing was typed (all zeros).

The toast text is `"You typed {words} words! WPM: {wpm}, Accuracy: {acc.toFixed(1)}%"`.

# Citations

* `calculateStats`, `handleKeyPress` and `endSession` in `src/hooks/use-letter-leap-game.ts`; `src/components/current-stats.tsx`.
