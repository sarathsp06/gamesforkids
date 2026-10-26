# 🎈 Games for Kids

[![Deploy](https://github.com/sarathsp06/gamesforkids/actions/workflows/deploy.yml/badge.svg)](https://github.com/sarathsp06/gamesforkids/actions/workflows/deploy.yml)

**Seven little learning games for ages 4–10, in English and Dutch.** No ads, no accounts, no tracking: it's a static
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
| 🖌️ | **Paint Pot** | Colours in pictures from fairy tales and fables with brush and bucket; hears each colour's name | sun and house → the Three Little Pigs, Red Riding Hood |

## 🤝 A promise

Everything your child does here stays right here, in the browser, on that device. Nothing goes anywhere, and
nobody is watching. I made this for my own children and I'm glad to share it with yours: free, no ads, no
accounts, and that's how it will stay. The code is open under the [MIT licence](LICENSE); the firm version of
all this is the in-app **Small print** page.

Two things a grown-up can choose to turn on change that, and the app says so where it makes the promise:
painting with others in Paint Pot, and moving progress to another device (see Parents below).

## 🦉 How it's put together

- **Who is playing?** A player is a drawn face and a name, kept on the device; no age is asked. Every player sees
  all seven games. A grown-up can switch a player to **Little**, which leaves the words off the tiles; **Big**, the
  default, shows labels and level dots.
- **Pip the owl** is the one voice: every prompt is spoken, and tapping Pip says it again.
- **Read Along** ends by reading the whole fable back slowly, one line lit at a time; **Letter Leap** says every key
  as it is pressed; **Paint Pot** has a white crayon that works as an eraser.
- **One sticker book** for every game: a finished round earns a sticker, with the same reward moment everywhere.
- **Grown-ups** sit behind a three-second hold on the gear: players, voice and sound, speaking pace, the Number
  Dash clock (off by default), and a week view of minutes played.

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
  sentence, leniently and in order. A stuck word glows, then is read aloud, then the story moves on. Listening is
  the game: if the browser can't listen, the microphone is blocked or missing, or no words come through, it stops
  and says plainly what's wrong and how to fix it.

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

SvelteKit (Svelte 5), TypeScript, prerendered to a static site. No game engine: boards are DOM and generated SVG,
animation is CSS. Progress lives in `localStorage`. Runtime dependencies are a font and, for Paint Pot only, two small
canvas libraries: [Atrament](https://github.com/jakubfiala/atrament) for the brush and
[q-floodfill](https://github.com/pavelkukov/q-floodfill) for the paint bucket. Two more load only when a grown-up
uses what needs them: [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1) to sign the encrypted messages
sent through public Nostr relays (Paint Pot with others, adding a friend, moving progress; see `src/lib/p2p.ts`)
and [qrcode](https://github.com/soldair/node-qrcode) for the QR codes. Both are MIT. Designs:
[presence](design/presence/index.markdown), [moving progress](design/progress-transfer/index.markdown).

## 🚀 Deploy

Every push to `main` builds and publishes to GitHub Pages ([deploy.yml](.github/workflows/deploy.yml), with
`BASE_PATH=/<repo name>`). One-time setup: **Settings → Pages → Source: GitHub Actions**.

## 👪 Parents

- **Letter Leap settings:** hold the ⚙️ on its start screen for 3 seconds: language, word level, sound, stickers,
  play history.
- **Read Along microphone:** the browser asks once for microphone access. Speech is recognised on the device where
  the browser can (Chrome), otherwise by the browser's speech service (Apple on iPad, Google in Chrome). The app
  keeps no audio.
- **Paint Pot with others** (Grown-ups, off by default): your child sees the faces of other children painting and
  the pictures they finish, and can paint side by side with a friend you added with a six-digit code or an invite link. Messages
  go through public relays, encrypted; devices never connect to each other or see each other's internet address.
  Only a drawn face, a screen and one colour per area of a picture are shared. No names, no chat, nothing typed, nothing stored.
- **Move to another device** (Grown-ups): show a QR code and scan it with the other device's camera; check the
  two pictures match and tap Send. Or save a file, or copy a small link that works without a connection.
  Taking progress in always adds to what is there and asks first.

## 📜 Credits

Fables are Aesop's (public domain), retold in our own words. Paint Pot's characters come from fairy tales and
fables (public domain), drawn in our own style. Voices: [Chatterbox
Multilingual](https://github.com/resemble-ai/chatterbox) (MIT). Fonts: [Andika](https://software.sil.org/andika/), made
for beginning readers, and [Fredoka](https://fonts.google.com/specimen/Fredoka) for titles. Icons:
[Material Symbols](https://fonts.google.com/icons) (Apache-2.0); flags: [circle-flags](https://github.com/HatScripts/circle-flags) (MIT);
stickers and story scenes: [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) flat (MIT), fetched once by
`scripts/emoji_fetch.py` so they look the same on every device.
