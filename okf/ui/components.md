---
type: Concept
title: Components
description: The five app components with their props, plus the handful of shadcn/ui primitives actually used
resource: src/components/
tags: [components, ui]
timestamp: 2026-10-05T19:13:38Z
---

# App components

| Component | Props | Notes |
|---|---|---|
| `MainLayout` | `children`, `title = "Typing Game Hub"` | Primary-coloured header with h1 `title`; container main; footer "© {year} Game Hub. Play and Learn!" |
| `WordDisplay` | `word \| null`, `typedPortion`, `currentIndex`, `feedback`, `feedbackLetter` | Null word → grey "..." box. Otherwise per-letter spans; see [Hand Hints & Feedback](/concepts/hand-hints.md). `aria-live="polite"` |
| `CurrentStats` | `wpm`, `accuracy` (0–1), `currentStreak`, `longestStreak`, `level`, `wordsTyped` | Grid of 5 `StatCard`s (icon in a primary/20 circle, title, big value). Icons: Gauge, Target, TrendingUp, Type, Gauge |
| `GameControls` | `isPlaying`, `isSessionOver`, `showStartScreen`, `onStart`, `onStop` | Large buttons with `Play` / `Square` icons (`RotateCcwIcon` is imported but unused) |
| `SessionStats` | `sessions` | Card "Past Sessions". Empty state: "No past sessions recorded yet…". Otherwise a table in a 300 px scroll area with columns Date (`formatDistanceToNow`, e.g. "5 minutes ago"), WPM, Accuracy %, Streak, Words, Duration ("x.x min") |

# shadcn/ui primitives actually used

`Card` (+Header/Title/Description/Content), `Button` (variants default/outline/destructive, size lg), `Table` family, `ScrollArea`, `Toast` + `Toaster` + the `use-toast` hook (one toast, on session end). All other files in `src/components/ui/` are unused.

# Svelte equivalents

| React | Svelte |
|---|---|
| shadcn/ui | [shadcn-svelte](https://www.shadcn-svelte.com) (`card`, `button`, `table`, `scroll-area`, `sonner` for toasts) or plain Tailwind markup; the components are trivial |
| `lucide-react` | `@lucide/svelte` (Svelte 5) |
| `date-fns` `formatDistanceToNow` | keep `date-fns`, or `Intl.RelativeTimeFormat` |
| `cn()` (`clsx` + `tailwind-merge`) | Svelte 5 `class={[...]}` arrays/objects, or keep `cn` |

# Citations

* `src/components/*.tsx`, `src/components/layout/main-layout.tsx`, `src/hooks/use-toast.ts`.
