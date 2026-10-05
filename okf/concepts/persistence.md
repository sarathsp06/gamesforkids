---
type: Concept
title: Persistence
description: Two localStorage keys — session history (JSON array, newest first, max 10) and selected language
resource: src/lib/store.ts
tags: [storage, localStorage]
timestamp: 2026-10-05T19:13:38Z
---

| Key | Value | Written | Read |
|---|---|---|---|
| `letterLeapSessions` | JSON `SessionStats[]`, newest first, at most 10 | on End Session | on mount |
| `letterLeapLanguage` | `"en"` or `"nl"` (raw string) | when the language toggle is clicked | on mount (anything else → `en`) |

`loadSessionStats()` returns `[]` on the server, when the key is missing, or on a JSON parse error (it logs to the console). `saveSessionStats()` swallows quota errors and logs them. There is no schema version or migration.

**Keep the same keys in the rewrite** so existing players keep their history.

# Svelte note

Read storage only in the browser: `onMount`, or guard with `browser` from `$app/environment`. With `adapter-static` + `prerender`, module code also runs at build time, where `localStorage` doesn't exist.

# Citations

* `src/lib/store.ts`; `LOCAL_STORAGE_*` in `src/lib/constants.ts`.
