export interface Question {
	text: string;
	answer: number;
}

type Rng = () => number;

export const SETS_PER_LEVEL = 10;
export const QUESTIONS_PER_SET = 10;
/** A questionnaire counts as passed when all 10 are answered within this time. */
export const PASS_MS = 60_000;
/** Passed questionnaires in a level needed to unlock the next level. */
export const PASS_SETS = 3;

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

const plus = (a: number, b: number): Question => ({ text: `${a} + ${b}`, answer: a + b });
const minus = (a: number, b: number): Question => ({ text: `${a} − ${b}`, answer: a - b });
const times = (a: number, b: number): Question => ({ text: `${a} × ${b}`, answer: a * b });

function addWithin(rng: Rng, max: number, minSum = 2) {
	const sum = int(rng, minSum, max);
	const a = int(rng, 1, sum - 1);
	return plus(a, sum - a);
}
function subtractWithin(rng: Rng, max: number, minTop = 2) {
	const a = int(rng, minTop, max);
	return minus(a, int(rng, 1, a - 1));
}

/** Ordered easiest to hardest; `example` is shown on the level button. */
export const LEVELS: { example: string; make: (rng: Rng) => Question }[] = [
	{ example: '2 + 1', make: (r) => addWithin(r, 5) },
	{ example: '4 + 5', make: (r) => addWithin(r, 10, 6) },
	{ example: '7 − 3', make: (r) => subtractWithin(r, 10) },
	{ example: '6 ± 2', make: (r) => (r() < 0.5 ? addWithin(r, 10) : subtractWithin(r, 10)) },
	{ example: '8 + 7', make: (r) => addWithin(r, 20, 11) },
	{ example: '15 − 6', make: (r) => subtractWithin(r, 20, 11) },
	{ example: '13 ± 5', make: (r) => (r() < 0.5 ? addWithin(r, 20, 11) : subtractWithin(r, 20, 11)) },
	{ example: '34 + 8', make: (r) => (r() < 0.5 ? plus(int(r, 10, 90), int(r, 2, 9)) : minus(int(r, 12, 99), int(r, 2, 9))) },
	{ example: '5 × 4', make: (r) => times([2, 5, 10][int(r, 0, 2)], int(r, 1, 10)) },
	{ example: '7 × 8', make: (r) => times(int(r, 2, 10), int(r, 2, 10)) }
];

/** mulberry32: tiny seeded PRNG so questionnaire N of a level is the same every time (times stay comparable). */
function seeded(seed: number): Rng {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** The fixed 10 questions of questionnaire `set` (0-based) in `level` (0-based); no repeats within a set. */
export function questionnaire(level: number, set: number): Question[] {
	const rng = seeded(level * 1000 + set + 1);
	const out: Question[] = [];
	// Level 1 has exactly 10 distinct sums, so allow a repeat only if uniqueness is impossible.
	for (let tries = 0; out.length < QUESTIONS_PER_SET; tries++) {
		const q = LEVELS[level].make(rng);
		if (tries > 500 || !out.some((o) => o.text === q.text)) out.push(q);
	}
	return out;
}

export const passedSets = (best: Record<string, number>, level: number) =>
	Array.from({ length: SETS_PER_LEVEL }, (_, s) => best[`${level}-${s}`]).filter((ms) => ms <= PASS_MS).length;

export const isUnlocked = (best: Record<string, number>, level: number) =>
	level === 0 || passedSets(best, level - 1) >= PASS_SETS;
