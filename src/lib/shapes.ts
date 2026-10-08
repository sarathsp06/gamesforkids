/**
 * Shape Sense: geometry and logic for pre-readers. Shapes are generated SVG paths in a
 * 100×100 box, so every question is fresh. Levels:
 * 1 find the shape (upright), 2 find it turned and stretched, 3 a look-alike that isn't one
 * (gap or curved side), 4 odd one out, 5 what comes next.
 */
export const SHAPE_LEVELS = 5;

export type Kind = 'circle' | 'triangle' | 'square' | 'rectangle';
export const KINDS: Kind[] = ['circle', 'triangle', 'square', 'rectangle'];
const COLORS = ['var(--red)', 'var(--blue)', 'var(--sun)', 'var(--leaf)'];
/** Graded like the other games: 1 right, ≥ NEAR almost, 0 not yet. */
export const ALMOST = 0.75;

export interface Shape {
	id: string;
	kind: Kind;
	color: string;
	d: string;
	closed: boolean;
}
export interface Option extends Shape {
	sim: number;
}
export interface Question {
	ask: 'find' | 'odd' | 'next';
	kind: Kind;
	row: Shape[];
	options: Option[];
}

type P = [number, number];
const CORNERS: Record<Exclude<Kind, 'circle'>, P[]> = {
	triangle: [[0, -1], [0.87, 0.5], [-0.87, 0.5]],
	square: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
	rectangle: [[-1.6, -1], [1.6, -1], [1.6, 1], [-1.6, 1]]
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
const pt = ([x, y]: P) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
let ids = 0;

/**
 * One shape, centred, longest side fitted to `size`. Not upright: random turn, and triangles
 * also get stretched thin or wide (a stretched square would be a rectangle).
 */
export function shape(kind: Kind, color: string, upright: boolean, broken?: 'gap' | 'curve', size = 80): Shape {
	const id = String(ids++);
	if (kind === 'circle') {
		const r = size / 2;
		return { id, kind, color, closed: true, d: `M${50 - r} 50 A${r} ${r} 0 1 0 ${50 + r} 50 A${r} ${r} 0 1 0 ${50 - r} 50 Z` };
	}
	const turn = upright ? 0 : rand(0, 2 * Math.PI);
	const stretch = upright || kind !== 'triangle' ? 1 : pick([rand(0.45, 0.7), rand(1.4, 1.8)]);
	let ps = CORNERS[kind].map(([x, y]): P => {
		x *= stretch;
		return [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn)];
	});
	const xs = ps.map((p) => p[0]), ys = ps.map((p) => p[1]);
	const k = size / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
	const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
	ps = ps.map(([x, y]) => [50 + (x - cx) * k, 50 + (y - cy) * k]);
	const [a, b] = ps;
	if (broken === 'gap') {
		// A third of one side missing: the outline doesn't join up.
		const d = `M${pt(lerp(a, b, 0.45))} ${[...ps.slice(1), a].map((p) => `L${pt(p)}`).join(' ')} L${pt(lerp(a, b, 0.1))}`;
		return { id, kind, color, closed: false, d };
	}
	let first = `L${pt(b)}`;
	if (broken === 'curve') {
		// One side bulges outward: closed, but not straight.
		const m = lerp(a, b, 0.5);
		const out: P = [m[0] - 50, m[1] - 50];
		const len = Math.hypot(...out) || 1;
		first = `Q${pt([m[0] + (out[0] / len) * size * 0.3, m[1] + (out[1] / len) * size * 0.3])} ${pt(b)}`;
	}
	return { id, kind, color, closed: true, d: `M${pt(a)} ${first} ${ps.slice(2).map((p) => `L${pt(p)}`).join(' ')} Z` };
}

const as = (s: Shape, sim: number): Option => ({ ...s, sim });

export function question(level: number): Question {
	const color = pick(COLORS); // one colour per question, so colour is never the clue
	if (level <= 3) {
		const kind = pick(level === 3 ? KINDS.filter((k) => k !== 'circle') : KINDS);
		const upright = level === 1;
		const others = shuffle(KINDS.filter((k) => k !== kind)).slice(0, level === 3 ? 1 : 2);
		const options = [as(shape(kind, color, upright), 1), ...others.map((k) => as(shape(k, color, upright), 0))];
		if (level === 3) options.push(as(shape(kind, color, false, pick(['gap', 'curve'] as const)), ALMOST));
		return { ask: 'find', kind, row: [], options: shuffle(options) };
	}
	if (level === 4) {
		// Square vs rectangle is too subtle when sizes and turns vary.
		const boxy = (k: Kind) => k === 'square' || k === 'rectangle';
		const same = pick(KINDS);
		const odd = pick(KINDS.filter((k) => k !== same && !(boxy(k) && boxy(same))));
		const options = [
			...[0, 1, 2].map(() => as(shape(same, color, false, undefined, rand(50, 85)), 0)),
			as(shape(odd, color, false, undefined, rand(50, 85)), 1)
		];
		return { ask: 'odd', kind: odd, row: [], options: shuffle(options) };
	}
	// What comes next: ABABA? or ABCAB?
	const n = pick([2, 3]);
	const colors = shuffle(COLORS);
	// No rectangles: next to a square in a small row they're too alike.
	const unit = shuffle(KINDS.filter((k) => k !== 'rectangle')).slice(0, n).map((k, i) => shape(k, colors[i], true, undefined, 70));
	const answer = unit[5 % n];
	const other = unit[(5 % n + 1) % n];
	return {
		ask: 'next',
		kind: answer.kind,
		row: Array.from({ length: 5 }, (_, i) => unit[i % n]),
		options: shuffle([
			as({ ...answer, id: String(ids++) }, 1),
			// Right shape, wrong colour: the child saw half the pattern.
			as(shape(answer.kind, other.color, true, undefined, 70), ALMOST),
			as({ ...other, id: String(ids++) }, 0)
		])
	};
}
