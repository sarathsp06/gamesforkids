---
type: Concept
title: Build & Deploy
description: npm scripts, Next static export to out/, Firebase Hosting (project boodl-web) via GitHub Actions, jest build test, and which dependencies are dead
resource: package.json
tags: [build, deploy, firebase, ci]
timestamp: 2026-10-05T19:13:38Z
---

# Scripts (`package.json`)

| Script | Command | Note |
|---|---|---|
| `dev` | `next dev --turbopack -p 9002` | local dev on port **9002** |
| `build` | `next build` | static export → `out/` |
| `start` | `next start` | irrelevant for a static export |
| `lint` / `typecheck` | `next lint` / `tsc --noEmit` | |
| `test` | `jest` | `tests/build.test.ts` runs a full `npm run build`. **This overwrites `.next` and breaks a running dev server**; stop dev first |
| `genkit:dev` / `genkit:watch` | `genkit start -- tsx src/ai/dev.ts` | broken: `src/ai/` does not exist |

`next.config.js`: `output: 'export'`, `images.unoptimized: true`.

# Hosting

`firebase.json` serves `out/` with an SPA rewrite `** → /index.html`.

GitHub Actions:

* `firebase-hosting-merge.yml`: on push to `master` → `npm ci && npm run build` → deploy to the `live` channel of project `boodl-web`, using secret `FIREBASE_SERVICE_ACCOUNT_BOODL_WEB`.
* `firebase-hosting-pull-request.yml`: preview channel per PR.

For SvelteKit: build with `@sveltejs/adapter-static` (`pages: 'out'`, `fallback: 'index.html'` or prerender every route). Then `firebase.json` and both workflows keep working unchanged, provided `npm run build` writes to `out/`.

# Dependencies

Needed at runtime: `next`, `react`, `react-dom`, `lucide-react`, `date-fns`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-{slot,scroll-area,toast}`, `tailwindcss-animate`.

Unused (do not port): `genkit`, `@genkit-ai/*`, `genkit-cli`, `firebase`, `@tanstack/react-query`, `@tanstack-query-firebase/react`, `recharts`, `react-hook-form`, `@hookform/resolvers`, `zod`, `patch-package`, `dotenv`, and most `@radix-ui/*` packages.

# Citations

* `package.json`, `next.config.js`, `firebase.json`, `.github/workflows/*.yml`, `tests/build.test.ts`.
