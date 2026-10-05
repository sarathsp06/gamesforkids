---
type: Concept
title: Theme & Animations
description: HSL CSS-variable theme (soft blue / pale green / orange), Geist font, and the custom keyframes used by the game
resource: src/app/globals.css
tags: [theme, css, tailwind, animation]
timestamp: 2026-10-05T19:13:38Z
---

# Colour tokens (light theme, HSL triplets in `:root`)

| Token | Value | Use |
|---|---|---|
| `--background` | `210 60% 98%` | page |
| `--foreground` | `220 25% 25%` | text |
| `--card` | `210 60% 96%` | cards, idle hand boxes |
| `--primary` | `200 53% 79%` (#ADD8E6 soft blue) | header, current letter, buttons |
| `--primary-foreground` | `210 50% 20%` | |
| `--secondary` | `120 60% 90%` | praise bubble |
| `--accent` | `39 100% 50%` (#FFA500 orange) | active hand, word border |
| `--destructive` | `0 72% 51%` | End Session, wrong letter |
| `--muted` / `--muted-foreground` | `210 40% 92%` / `210 30% 50%` | placeholders |
| `--feedback-correct` | `120 73% 75%` (#90EE90) | correct pulse |
| `--feedback-incorrect` | `0 72% 51%` | wrong pulse |
| `--radius` | `0.5rem` | |

A `.dark` palette exists, but nothing toggles it. The chart and sidebar tokens are unused.

Tailwind maps these as `hsl(var(--x))` colours (`tailwind.config.ts`). Plugin: `tailwindcss-animate`.

# Custom animations (`globals.css`)

| Class | Keyframes | Duration |
|---|---|---|
| `animate-letter-appear` | opacity 0→1, scale .5→1, translateY 20→0 | 0.3 s ease-out |
| `feedback-correct` / `feedback-incorrect` | background pulse 50%→100%→50% of the feedback colour | 0.5 s |
| `animate-praise-pop` | scale .5→1.1→1, slight bounce | 0.4 s `cubic-bezier(.68,-.55,.27,1.55)` |
| `.hand-indicator-visual` (`.active`) | see [Hand Hints & Feedback](/concepts/hand-hints.md) | 0.3 s transition |

`.hand-indicator-visual` sizes: 80 px (md+), 64 px, 48 px at ≤768 px, 40 px at ≤480 px. `.can-proceed-pulse` is dead.

# Design intent (`docs/blueprint.md`)

Calm soft blue, pale green for success, orange for attention; simple sans-serif; uncluttered; gentle animations. The blueprint's "random letters + AI adaptive speed" feature was never built.

# Svelte note

Copy `globals.css` (minus the sidebar, chart and `.can-proceed-pulse` rules) into `src/app.css`. With Tailwind v4, move the colour map into `@theme`; with v3, reuse `tailwind.config.ts` unchanged. Use the `@fontsource-variable/geist` package, or keep the system font.

# Citations

* `src/app/globals.css`, `tailwind.config.ts`, `docs/blueprint.md`.
