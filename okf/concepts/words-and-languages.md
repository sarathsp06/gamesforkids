---
type: Concept
title: Words & Languages
description: Two languages (English, Dutch), 90 plain A–Z uppercase words each, random pick with repeats; language persisted in localStorage
resource: src/lib/constants.ts
tags: [words, i18n, content]
timestamp: 2026-10-05T19:13:38Z
---

# Languages

```ts
type Language = 'en' | 'nl';
LANGUAGES = [
  { id: 'en', label: 'English',    speechLang: 'en-US' },
  { id: 'nl', label: 'Nederlands', speechLang: 'nl-NL' },
];
```

* The default is `'en'`. The choice is saved to `localStorage["letterLeapLanguage"]` and restored on mount; only `'en'`/`'nl'` are accepted.
* The language only affects the word list and the speech voice. **All UI text and praise messages are English.** If the rewrite translates the UI, keep the praise short; the kids can barely read.
* The toggle is shown only on the start screen, as two buttons with `aria-pressed`.

# Word lists (`WORDS_BY_LANGUAGE`)

* 90 words per language, for ages 4–8: animals, colours, food, home, body parts, simple verbs.
* Words are stored **UPPERCASE** and are spoken lowercase (otherwise TTS spells acronyms like "CAT" as C‑A‑T).
* **Letters A–Z only, no accents, spaces or digits.** The input filter `/^[a-zA-Z]$/` relies on this. Dutch "IJ" words (`IJS`, `BLIJ`, `TIJGER`) are typed as two letters, I then J.
* Lengths range from 2 (`NO`, `JA`) to 11 (`CATERPILLAR`). There is no difficulty ordering; selection ignores length.
* Selection: `words[Math.floor(Math.random() * words.length)]`. Repeats are possible, including back-to-back.

Copy the arrays verbatim from `src/lib/constants.ts` into the rewrite (they are pure data).

# Citations

* `src/lib/constants.ts`: `LANGUAGES`, `WORDS_BY_LANGUAGE`, `LOCAL_STORAGE_LETTER_LEAP_LANGUAGE_KEY`.
