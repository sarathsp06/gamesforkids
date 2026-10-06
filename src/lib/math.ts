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

/** Random number with exactly `d` digits (1-digit excludes 0). */
const digits = (rng: Rng, d: number) => int(rng, d === 1 ? 1 : 10 ** (d - 1), 10 ** d - 1);
const add = (rng: Rng, da: number, db: number) => plus(digits(rng, da), digits(rng, db));
/** a − b with a of `da` digits and b of `db` digits, never negative. */
function sub(rng: Rng, da: number, db: number) {
	const lo = db === 1 ? 1 : 10 ** (db - 1);
	const a = Math.max(digits(rng, da), lo + 1);
	return minus(a, int(rng, lo, Math.min(10 ** db - 1, a - 1)));
}
const addOrSub = (rng: Rng, da: number, db: number) => (rng() < 0.5 ? add(rng, da, db) : sub(rng, da, db));

/** Ordered easiest to hardest; `example` is shown on the level button. */
export const LEVELS: { example: string; make: (rng: Rng) => Question }[] = [
	{ example: '4 + 5', make: (r) => add(r, 1, 1) },
	{ example: '23 + 45', make: (r) => add(r, 2, 2) },
	{ example: '123 + 456', make: (r) => add(r, 3, 3) },
	{ example: '34 ± 8', make: (r) => addOrSub(r, 2, 1) },
	{ example: '74 − 36', make: (r) => sub(r, 2, 2) },
	{ example: '345 ± 27', make: (r) => addOrSub(r, 3, 2) },
	{ example: '612 − 348', make: (r) => sub(r, 3, 3) },
	{ example: '7 × 8', make: (r) => times(digits(r, 1), digits(r, 1)) },
	{ example: '24 × 3', make: (r) => times(digits(r, 2), digits(r, 1)) },
	{ example: '48 ÷ 6', make: (r) => {
		const b = int(r, 2, 9), q = int(r, 2, 12);
		return { text: `${b * q} ÷ ${b}`, answer: q };
	} }
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
	// Reject repeats within a set; the try cap is only a safety net.
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
