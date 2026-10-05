---
type: Concept
title: Speech (Text-to-Speech)
description: Each new word is spoken with the Web Speech API; explicit voice selection, cancel-only-if-busy, user-gesture start and a 4s reveal fallback
resource: src/hooks/use-letter-leap-game.ts
tags: [speech, audio, browser-api, accessibility]
timestamp: 2026-10-05T19:13:38Z
---

# Behaviour

The child **hears the word before seeing it**. The word box shows "..." and the hand hint is off until speech ends; then the word appears and typing is accepted. There is no replay button. That was deliberate: the users can't read the label, and it was removed on request.

# `speakWord(word, onDone)`

```
synth = window.speechSynthesis
if no synth or no word: onDone(); return          # no-TTS browsers still play
if synth.speaking or synth.pending: synth.cancel()
u = new SpeechSynthesisUtterance(word.toLowerCase())
u.lang  = LANGUAGES[language].speechLang          # 'en-US' | 'nl-NL'
u.voice = first voice with lang == speechLang (treat '_' as '-')
          ?? first voice whose lang starts with 'en' / 'nl'
u.rate = 0.8; u.pitch = 1.2
u.onend = u.onerror = onDone
synth.speak(u)
```

# Browser workarounds (keep all of them)

| Problem | Fix |
|---|---|
| Chrome silently drops `speak()` issued right after `cancel()` | Cancel only when `speaking`/`pending` |
| Setting only `lang` can pick a silent or wrong default voice | Pick a voice explicitly via `getVoices()` |
| Safari/iOS block speech that a user gesture did not start | The first `speak()` runs **synchronously** in the Start click handler |
| Chrome sometimes never fires `onend` | 4000 ms timer forces the word visible |
| Speech continues after leaving or ending | `cancel()` on End Session and on unmount |

`getVoices()` may be empty on the very first call in Chrome (voices load asynchronously; `voiceschanged` event). The current code accepts that: `lang` alone is then used. A rewrite may listen to `voiceschanged`, but it isn't required.

Verified in headed Chrome on macOS: the Dutch voice "Xander" spoke "lezen" and "lief", and `onend` fired after about 0.4–0.8 s.

# Svelte note

Put this in a plain TS module (`speech.ts`) with no framework dependency. Call it from the click handler, **not** from an `$effect`, for the first word.

# Citations

* `speakWord`, `showNewWord`, `startGame` and the safety-net effect in `src/hooks/use-letter-leap-game.ts`.
