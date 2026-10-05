---
type: Concept
title: Game State
description: Shape and initial values of GameState plus the hook-local state (language, wordHidden, pastSessions)
resource: src/types/index.ts
tags: [state, types]
timestamp: 2026-10-05T19:13:38Z
---

# GameState (`src/types/index.ts`)

| Field | Type | Initial | Meaning |
|---|---|---|---|
| `currentWord` | `string \| null` | null | Word being typed, **UPPERCASE** |
| `currentWordIndex` | number | 0 | Index of the next letter to type |
| `typedWordPortion` | string | "" | Correctly typed prefix (always `currentWord.slice(0, index)`) |
| `isPlaying` | bool | false | A session is running |
| `isSessionOver` | bool | false | At least one session has ended (switches the button label to "Play Again") |
| `showStartScreen` | bool | true | Show the welcome card instead of the game area |
| `feedback` | `'correct' \| 'incorrect' \| 'timeout' \| null` | null | Result of the last key press (cleared after 700 ms); `'timeout'` is unused |
| `feedbackLetter` | `string \| null` | null | The **target** letter at the time of the press |
| `currentLevel` | number | 1 | Shown in the UI, never changes (dead) |
| `correctPresses` | number | 0 | Correct key presses this session |
| `totalPresses` | number | 0 | All accepted key presses |
| `wordsTyped` | number | 0 | Completed words |
| `gameStartTime` | `number \| null` | null | `Date.now()` at start |
| `currentWPM` | number | 0 | Rounded integer |
| `currentAccuracy` | number | 0 | Ratio 0–1 |
| `currentStreak` / `longestStreak` | number | 0 | Consecutive correct presses |
| `showPraiseMessage` | bool | false | Praise bubble visible |
| `praiseText` / `praiseIcon` | `string \| null`, `LucideIcon \| null` | null | The chosen praise |
| `activeHand` | `'left' \| 'right' \| null` | null | Hand for the next letter |

`PerformanceData` is the stats subset that `GameState` extends.

# Hook-local state (outside GameState)

* `language: 'en' | 'nl'`, persisted (see [Persistence](/concepts/persistence.md)).
* `wordHidden: boolean`: true while the new word is being spoken (see [Game Loop](/architecture/game-loop.md)).
* `pastSessions: SessionStats[]`: newest first, at most 10.
* `synthRef`: the `window.speechSynthesis` handle.

# Svelte note

Hold all of this in one `$state` object inside a `.svelte.ts` module (or a class with `$state` fields). Replace the boolean flags `isPlaying`/`showStartScreen`/`wordHidden`/`showPraiseMessage` with `phase: 'start' | 'listening' | 'typing' | 'praise'` plus `hasPlayed: boolean` (for the "Play Again" label). Store the praise **index** or icon component, not a React component type.

# Citations

* `src/types/index.ts`; `initialGameState` in `src/hooks/use-letter-leap-game.ts`.
