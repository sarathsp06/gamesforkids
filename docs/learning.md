# What we learned about children's learning (and how the code uses it)

Synthesis of three research briefs (sources linked inside each):

- [research-spelling-development.md](research-spelling-development.md) — spelling/reading stages, ages 4–8
- [research-numeracy-errors.md](research-numeracy-errors.md) — arithmetic errors and what they mean
- [research-feedback-motivation.md](research-feedback-motivation.md) — feedback, praise, rewards, difficulty

## The core finding: errors have meaning

A child's wrong answer is rarely random. It reveals the strategy they used:

- **KAT for CAT** is *phonetic-stage spelling* (Gentry): every sound heard and mapped.
  It predicts later reading success (Ouellette & Sénéchal) and deserves credit, not a buzzer.
- **56 for 57** is a *counting slip* — right strategy, off-by-one execution (Siegler; Geary's
  counting-string retrieval neighbors). **74 for 47** is digit transposition; in Dutch
  ("vierenzeventig" = four-and-seventy) it's a *linguistic* error, not a math one (Zuber).
- **R for T** while typing is a motor slip; **B for D** is age-normal mirror confusion (Fischer).
- Graded partial-credit scoring is established practice in research instruments
  (Tangel–Blachman 0–6; Caravolas per-grapheme) and predicts outcomes better than binary scoring.

## How the games encode it

`src/lib/score.ts` is the shared engine: each game maps an answer to a similarity 0–1,
and a question's wrong attempts fold into a grade — **gold** (first try), **silver**
(one near miss, similarity ≥ 0.7), **bronze** (completed after more tries). Never "failed":
children under ~11 learn poorly from negative feedback (van Duijvenvoorde).

| Game | Metric | Near misses it recognizes |
| --- | --- | --- |
| Spell Pick | `similarity()` in `spell.ts`: edit distance with phonetic costs | sound-alike letters (K/C, EI/IJ) cheap; vowel-for-vowel cheap; double-letter drops cheap; first-sound change costs double (MOUSE ≠ HOUSE) |
| Number Dash | `numberSimilarity()`: exact, except two named slips — from level 6 only | off by one (7 or 9 for 8: counting slip), last two digits swapped (47 for 74: Dutch inversion). 6 for 8 or 67 for 57 is far. |
| Letter Leap | `keySimilarity()` per press | neighbour keys (motor slip), mirror letters (B/D, P/Q), sound-alikes (C/K, S/Z) |
| Shape Sense | fixed per option in `question()` (`shapes.ts`) | level 3: the asked shape with a gap or a curved side (looks right, fails "straight sides, closed"); level 5: right shape, wrong colour (half the pattern). Shape levels follow Clements & Sarama's learning trajectory: prototypes → turned/stretched → defining attributes → classification → patterns. |

**Spell Pick levels** (`choices()` in `spell.ts`): 1 clearly different real words (CAT / BOOK /
BUS); 2 the closest real words (CAT / CAR / CANDY); 3 a sound-alike spelling + a far word
(CAT / KAT / BUS — CAT gold, KAT silver, BUS bronze); 4 a sound-alike spelling + a close word
(CAT / KAT / CAR). `soundAlikes()` builds spellings from same-sound pairs only (C/K, S/Z, PH/F,
AI/AY; Dutch EI/IJ, AU/OU, CH/G, final D→T, halved double consonants) and drops swaps that change
the sound (soft C, Z before a consonant). Four first-try words in a round moves up a level.

**Number Dash stays exact on levels 1–5**: 5 + 3 is 8, and there is no honest "almost" for small
sums. From level 6 (multi-digit work) the two slips above earn silver, because they show the
method was right.

Feedback follows the research: near misses get warm amber + "Almost!" and a repeat of the
word (positive-first framing, immediate, spoken — pre-readers can't read error text);
far misses get a gentle bloop and the prompt again. Grades show as colored stars, which are
performance information (safe) rather than contracted prizes (overjustification risk, Lepper).

## Known deviations from the research

- **Number Dash shows a ticking clock bar** during play, which the numeracy brief advises
  against for ages 4–6 (Boaler; Henry & Brown). Kept for now because the game was designed
  around beating best times; the fix (opt-in speed play, invisible timing) is listed below.
- **The spelling scorer is edit distance with phonetic costs, not true phonological distance**:
  the brief recommends grapheme-to-phoneme comparison (Tangel–Blachman style). Our kernel
  approximates it — sound-alike substitutions and digraph normalization are cheap — but it
  compares letters, not phonemes, so some sound-identical spellings still score below 1.

## Recorded for later (not yet built)

- **Adaptive difficulty at the 85% rule** (Wilson 2019): target 75–90% success on a rolling
  window; Letter Leap's tier auto-move and Spell Pick's level-up (4 of 5 first-try) are crude versions.
- **Re-queue missed items** 2–3 items later with scaffold, then once more unscaffolded
  (successive relearning, Rawson & Dunlosky).
- **Show the conventional form as a bonus** when a child picks a sound-alike spelling (KAT →
  "sounds right! we write it C-A-T"); Gentry says conventional accuracy is *not* the norm at 4–6.
- **Dutch-specific drills**: vowel doubling (man/maan), ei/ij, d/t finals are transitional-stage
  conventions; Dutch kids can ramp word length faster (Seymour: transparent orthography).
- **Dutch inversion message** in Number Dash: "bijna — de cijfers staan omgedraaid".
- **No visible countdown under ~7** (Boaler; Henry & Brown): Number Dash's clock bar could
  become an opt-in "speed play" toggle, with invisible response-time logging to tell
  retrieval (<3 s) from counting.
- **Process praise only** (Mueller & Dweck): praise pools already say "You did it!" — keep
  effort/strategy wording, never "you're smart".
