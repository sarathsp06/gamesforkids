---
okf_version: "0.1"
---

# Kids Learning Games (Game Hub)

A client-only web app with one game, **Letter Leap**: a typing game for young children (about 4–8, barely reading). The game reads a word aloud in English or Dutch, shows it big on screen, and the child types it letter by letter. Hand hints, colour flashes and praise help along the way. There is no backend: everything runs in the browser, session history lives in `localStorage`, and the site is exported as static HTML to Firebase Hosting.

The current implementation is Next.js 15 (App Router) + React 18 + TypeScript + Tailwind CSS + shadcn/ui. This bundle describes the **behaviour** independently of React, so the app can be rewritten in Svelte/SvelteKit (or anything else) without reading the React source.

> **Historical.** The Next.js app this bundle describes has been replaced by the SvelteKit app at the repo root (spec: `docs/redesign.md`), and hosting moved from Firebase to GitHub Pages. The source described here is at commit `9bd68d7`. Behaviour notes remain useful; file paths, Firebase and CI details no longer match the repo.

# Start here

* [Architecture Overview](/architecture/overview.md) - what runs where, file map, dependency graph
* [Game Loop](/architecture/game-loop.md) - the full state machine, every timer, every transition (the core spec)
* [Svelte Rewrite Guide](/architecture/svelte-port.md) - target structure, React→Svelte mapping, pitfalls, acceptance checklist

# Knowledge

* [Architecture](/architecture/index.md) - overview, game loop, rewrite guide
* [Concepts](/concepts/index.md) - game state, words and languages, speech, keyboard input, scoring, hand hints, persistence
* [UI](/ui/index.md) - routes, components, theme and animations
* [Config](/config/index.md) - build, hosting, CI, tooling, dead dependencies
