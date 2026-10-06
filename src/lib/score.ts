/**
 * Graded closeness scoring — the core idea shared by every game.
 *
 * Children's errors are not all equal: KAT for CAT is phonetically right
 * (a developmental stage, not a failure), 56 for 57 is a counting slip,
 * pressing R for T is a motor slip. Each game maps an answer to a
 * similarity in 0–1 via a domain metric, and attempts fold into a grade:
 *   gold    first try right
 *   silver  one near miss (similarity ≥ NEAR)
 *   bronze  anything worse — still completed, never "failed"
 */

export type Grade = 'gold' | 'silver' | 'bronze';

/** A wrong answer this close still counts as "almost right". */
export const NEAR = 0.7;

/** Fold the similarities of a question's wrong attempts into a grade. */
export function gradeAttempts(wrongSims: number[]): Grade {
	if (wrongSims.length === 0) return 'gold';
	if (wrongSims.length === 1 && wrongSims[0] >= NEAR) return 'silver';
	return 'bronze';
}

/* ------------------------------------------------------------------ */
/* Weighted edit distance: the engine behind string-shaped metrics.    */
/* ------------------------------------------------------------------ */

export interface EditCosts {
	/** Substitution cost, 0 (same) … 1 (unrelated). Gets both positions. */
	sub(x: string, y: string, i: number, j: number): number;
	/** Insert/delete cost of s[i]. */
	indel(s: string, i: number): number;
	/** Adjacent transposition: right symbols, wrong order. */
	swap: number;
}

/** Damerau–Levenshtein with pluggable costs. */
export function editDistance(a: string, b: string, c: EditCosts): number {
	const m = a.length, n = b.length;
	const d = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
	for (let i = 1; i <= m; i++) d[i][0] = d[i - 1][0] + c.indel(a, i - 1);
	for (let j = 1; j <= n; j++) d[0][j] = d[0][j - 1] + c.indel(b, j - 1);
	for (let i = 1; i <= m; i++)
		for (let j = 1; j <= n; j++) {
			d[i][j] = Math.min(
				d[i - 1][j] + c.indel(a, i - 1),
				d[i][j - 1] + c.indel(b, j - 1),
				d[i - 1][j - 1] + c.sub(a[i - 1], b[j - 1], i - 1, j - 1)
			);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + c.swap);
		}
	return d[m][n];
}

/** Distance normalized to 0–1 similarity by the longer length. */
export const editSimilarity = (a: string, b: string, c: EditCosts): number =>
	Math.max(0, 1 - editDistance(a, b, c) / Math.max(a.length, b.length, 1));

/* ------------------------------------------------------------------ */
/* Numbers: magnitude sense + digit-shape errors.                      */
/* ------------------------------------------------------------------ */

const DIGIT_COSTS: EditCosts = {
	// A digit off by one is a counting slip, not a wild guess.
	sub: (x, y) => (x === y ? 0 : Math.abs(+x - +y) === 1 ? 0.5 : 1),
	indel: () => 1,
	// Transposed digits (47 for 74): place-value confusion, classic and meaningful.
	swap: 0.5
};

/**
 * How close a numeric answer is: the better of magnitude closeness
 * (56 for 57 shows real number sense) and digit-shape closeness
 * (47 for 74 is a place-value slip, not ignorance).
 */
export function numberSimilarity(guess: number, answer: number): number {
	if (!Number.isFinite(guess)) return 0;
	if (guess === answer) return 1;
	const magnitude = 1 - Math.abs(guess - answer) / Math.max(Math.abs(answer), 10);
	const digits = editSimilarity(String(guess), String(answer), DIGIT_COSTS);
	return Math.max(0, magnitude, digits);
}

/* ------------------------------------------------------------------ */
/* Keyboard: motor slips and letter confusions while typing.           */
/* ------------------------------------------------------------------ */

const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
/** Mirror-image letters young children genuinely confuse. */
const MIRRORS = ['BD', 'PQ', 'MW', 'NU'];
/** Letters whose sounds are easy to mishear. */
const SOUND_ALIKES = ['CK', 'SZ', 'FV', 'GJ', 'MN'];

function keyPos(k: string): [number, number] | null {
	for (let r = 0; r < KEY_ROWS.length; r++) {
		const col = KEY_ROWS[r].indexOf(k);
		// Rows shift right on a real keyboard; offset mimics that.
		if (col >= 0) return [col + r * 0.5, r];
	}
	return null;
}
/** How forgivable a wrong key press is: 1 exact, ~0.75 neighbour/confusable, 0.2 unrelated. */
export function keySimilarity(pressed: string, target: string): number {
	if (pressed === target) return 1;
	const pair = pressed + target;
	if (MIRRORS.some((m) => m.includes(pressed) && m.includes(target))) return 0.75;
	if (SOUND_ALIKES.some((s) => s.includes(pressed) && s.includes(target))) return 0.75;
	const p = keyPos(pressed), t = keyPos(target);
	if (p && t && Math.hypot(p[0] - t[0], p[1] - t[1]) <= 1.2) return 0.75;
	return 0.2;
}
