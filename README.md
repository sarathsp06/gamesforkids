# 🎈 Games for Kids

[![Deploy](https://github.com/sarathsp06/gamesforkids/actions/workflows/deploy.yml/badge.svg)](https://github.com/sarathsp06/gamesforkids/actions/workflows/deploy.yml)

**Six little learning games for ages 4–10, in English and Dutch.** No ads, no accounts, no tracking: it's a static
site, everything stays on the device.

▶️ **Play:** <https://sarathsp06.github.io/gamesforkids/>

| | Game | What the child does | Grows from… → to… |
|---|---|---|---|
| 🅰️ | **Letter Leap** | Hears a word, types it on a colour-coded keyboard | home-row words → seven-letter words |
| ➕ | **Number Dash** | Races through 10 sums against the clock | 1-digit + → division |
| 🔤 | **Spell Pick** | Hears a word, picks the right spelling of three | *cat · book · bus* → *cat · kat · car* |
| 🔺 | **Shape Sense** | Finds, compares and counts shapes; every prompt spoken | find the circle → count hidden triangles |
| ♞ | **Chess Path** | Moves one chess piece to collect stars, then plays Hexapawn | rook on 4×4 → beat a smart computer |
| 📖 | **Read Along** | Reads Aesop's fables aloud; words light up as they're read | "The lion is asleep." → full fables |

## ✨ What makes it different

- **"Almost!" counts.** Answers are graded by *how close* they were, not right/wrong. *kat* for *cat* sounds right, R
  for T is a neighbour key, 7 for 8 is a counting slip: those earn a warm amber "Almost!" and a silver star. Gold is
  first try, bronze is still a finish, never a fail. Parents can read the rules on the in-app **How we score** page;
  the research behind it is in [docs/learning.md](docs/learning.md).
- **Made for pre-readers.** Prompts are spoken, answers are taps. Levels adapt: four first-try answers out of five
  moves the child up.
- **Real voices.** Every line is a recorded neural voice clip, rendered once on a Mac with an open model and checked
  by speech recognition (see [scripts/voice.md](scripts/voice.md)); the browser voice fills any gap.
- **Thinking, not tapping.** Chess Path puzzles are solved by the game first, so it knows the shortest way and can
  nudge a stuck child to the next good square. Hexapawn is a proven win for whoever moves second, so the computer
  always starts: the child can always win, but only by playing well.
- **Reading with a helper.** Read Along listens as the child reads and matches what it hears against the known
  sentence, leniently and in order. A stuck word glows, then is read aloud, then the story moves on. Where the
  browser can't listen (Firefox), it reads the story aloud with each word lit up instead.

## 🧑‍💻 Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # type-check
npm run build    # static site in build/
```

Tests are plain assertion scripts:

```bash
for t in tests/*.test.ts; do npx tsx "$t"; done
```

SvelteKit (Svelte 5), TypeScript, prerendered to a static site. No game engine and no runtime dependencies beyond a
font: boards are DOM and generated SVG, animation is CSS. Progress lives in `localStorage`.

## 🚀 Deploy

Every push to `main` builds and publishes to GitHub Pages ([deploy.yml](.github/workflows/deploy.yml), with
`BASE_PATH=/<repo name>`). One-time setup: **Settings → Pages → Source: GitHub Actions**.

## 👪 Parents

- **Letter Leap settings:** hold the ⚙️ on its start screen for 3 seconds: language, word level, sound, stickers,
  play history.
- **Read Along microphone:** the browser asks once for microphone access. Speech is recognised on the device where
  the browser can (Chrome), otherwise by the browser's speech service (Apple on iPad, Google in Chrome). The app
  keeps no audio.

## 📜 Credits

Fables are Aesop's (public domain), retold in our own words. Voices: [Chatterbox
Multilingual](https://github.com/resemble-ai/chatterbox) (MIT). Font: [Andika](https://software.sil.org/andika/), made
for beginning readers.
