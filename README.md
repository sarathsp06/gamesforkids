# Games for Kids

Five games for young children (about 4–10), picked from the home screen.

**Letter Leap** (`/letter-leap/`) is a typing game. It says a word out loud in English or Dutch, and the child finds its letters on the keyboard. Left-hand keys are red, right-hand keys are blue, the next key glows yellow, and a hand badge beside the word shows which hand to use. Five words earn a sticker.

**Number Dash** (`/math/`) is a timed math game with 10 levels of increasing difficulty: 1-digit +, 2-digit +, 3-digit +, 2-digit ± 1-digit, 2-digit −, 3-digit ± 2-digit, 3-digit −, times tables, 2-digit × 1-digit, and division. Each level has 10 fixed questionnaires of 10 questions, so times can be compared. Every questionnaire keeps its best time. Finishing 3 questionnaires of a level in under 1 minute each unlocks the next level. Unlocked levels stay open for practice.

**Spell Pick** (`/spell/`) is a word-recognition game. After a short pause it says a word out loud in English or Dutch, and the child picks the right spelling from three. Four levels: 1 clearly different words (*cat*, *book*, *bus*), 2 look-alike real words (*cat*, *car*), 3 a spelling that sounds right (*cat*, *kat*, *bus*), 4 both (*cat*, *kat*, *car*). Four first-try words in a round of five moves up a level. Five words earn a trophy.

**Shape Sense** (`/shapes/`) teaches shapes and logic to pre-readers: every prompt is spoken, every answer is a tap. Seven levels: 1 find the shape, 2 find it turned and stretched, 3 a look-alike with a gap or curved side next to the real one (almost), 4 odd one out, 5 what comes next in a pattern (right shape, wrong colour is almost), 6 count overlapping circles, 7 count the triangles among other shapes (one off is almost). Shapes are generated SVG, so questions never run out. Four first-try answers in a round of five moves up a level.

**Chess Path** (`/chess/`) builds chess thinking one rule at a time, with spoken prompts and taps only. Levels 1–6 are path puzzles: move one piece to take every star in the fewest moves (1 rook on 4×4, 2 rook with rocks and two stars, 3 bishop, 4 knight, 5 knight with two stars, move dots shown only after a wrong tap, 6 a red guard watches some squares and stopping there gets caught). Puzzles are generated and solved by breadth-first search, so each has a known fewest-moves par: par is gold, one extra move is almost (silver), and after two wasted moves the next best square glows. Levels 7–8 are Hexapawn (3×3, three pawns each) against an easy and then a smart computer. The computer moves first, and the second player always wins Hexapawn with best play, so the child can always win, but only by playing well. Rounds are 5 puzzles or 3 games; all but one first-try win moves up a level.

All games grade each answer by **how close** it was, not just right/wrong — typing R for T (neighbour key) is a near slip, picking *kat* for *cat* sounds right (warm amber, "Almost!"). Number Dash stays exact on levels 1–5; from level 6 only a counting slip (7 or 9 for 8) or swapped digits (47 for 74) counts as almost. Stars are gold (first try), silver (one near miss) or bronze. Parents can read this on the in-app **How we score** page (`/how-we-score/`); the research is in [docs/learning.md](docs/learning.md).

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
src/routes/shapes/            Shape Sense screens: start, play, reward
src/routes/chess/             Chess Path screens: start, board, reward
src/routes/math/              Number Dash screens: levels, questionnaires, play, result
src/lib/math.ts               Number Dash levels, seeded questionnaires, unlock rule
src/lib/spell.ts              Spell Pick levels, sound-alike spellings and phonetic similarity
src/lib/shapes.ts             Shape Sense shape generator and questions per level
src/lib/chess.ts              Chess Path piece moves, puzzle generator and solver, Hexapawn and its computer player
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
tests/chess.test.ts           Chess Path: move rules, solvable puzzles, Hexapawn is a second-player win
okf/                          knowledge bundle describing the previous Next.js version
```
