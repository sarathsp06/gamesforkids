# Games for Kids

Three games for young children (about 4–8), picked from the home screen.

**Letter Leap** (`/letter-leap/`) is a typing game. It says a word out loud in English or Dutch, and the child finds its letters on the keyboard. Left-hand keys are red, right-hand keys are blue, the next key glows yellow, and a hand badge beside the word shows which hand to use. Five words earn a sticker.

**Number Dash** (`/math/`) is a timed math game with 10 levels of increasing difficulty: 1-digit +, 2-digit +, 3-digit +, 2-digit ± 1-digit, 2-digit −, 3-digit ± 2-digit, 3-digit −, times tables, 2-digit × 1-digit, and division. Each level has 10 fixed questionnaires of 10 questions, so times can be compared. Every questionnaire keeps its best time. Finishing 3 questionnaires of a level in under 1 minute each unlocks the next level. Unlocked levels stay open for practice.

**Spell Pick** (`/spell/`) is a word-recognition game. After a short pause it says a word out loud in English or Dutch, and the child picks it from three real words (e.g. *book*, *car*, *cat*). Five words earn a trophy.

All games grade each answer by **how close** it was, not just right/wrong — typing R for T (neighbour key) is a near slip, answering 56 for 57 is a counting slip (warm amber, "Almost!"). Stars are gold (first try), silver (one near miss) or bronze. The research behind this is in [docs/learning.md](docs/learning.md).

Built with SvelteKit (Svelte 5) and prerendered to a static site. No backend: progress and history live in `localStorage`, speech uses the browser's `speechSynthesis`.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # type-check
npm run build    # static site in build/
npm run preview
```

## Parents

Hold the gear on the start screen for 3 seconds to open settings: language, word level (automatic or fixed), sound effects, sticker reset and play history.

## Deploy

`.github/workflows/deploy.yml` builds on every push to `main` and publishes `build/` to GitHub Pages, with `BASE_PATH=/<repo name>`. One-time setup: in the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.

## Layout

```
src/routes/+page.svelte       game hub
src/routes/letter-leap/       Letter Leap screens: start, play, reward, sticker book
src/routes/spell/             Spell Pick screens: start, play, reward
src/routes/math/              Number Dash screens: levels, questionnaires, play, result
src/lib/math.ts               Number Dash levels, seeded questionnaires, unlock rule
src/lib/spell.ts              Spell Pick misspelling generator and phonetic similarity
src/lib/score.ts              graded closeness scoring shared by all games
src/lib/game.svelte.ts        game state machine and timings
src/lib/words.ts              word lists, difficulty tiers, stickers, praise
src/lib/audio.ts              speech and sound effects
src/lib/storage.ts            localStorage keys
src/lib/Keycap.svelte         keyboard key
src/lib/ParentDialog.svelte   parent settings
docs/redesign.md              design spec
docs/learning.md              research notes: how children learn, mapped to the scoring engine
tests/score.test.ts           scoring assertions (npx tsx tests/score.test.ts)
okf/                          knowledge bundle describing the previous Next.js version
```
