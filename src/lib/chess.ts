/**
 * Chess Path: chess thinking for 5–10 year olds, one rule at a time. Levels:
 * 1 rook on 4×4, one star; 2 rook on 5×5 with rocks, two stars; 3 bishop; 4 knight, one star;
 * 5 knight, two stars and rocks (move dots only after a wrong tap); 6 a guard watches some squares;
 * 7 Hexapawn against an easy computer; 8 Hexapawn against a computer that plays its best.
 *
 * Puzzles are generated and solved by breadth-first search, so each one has a known fewest-moves
 * "par": that is how close a solution was. Stars are taken like chess captures: you must land on
 * one, and it blocks a rook or bishop line until taken.
 */
export { CHESS_LEVELS } from './limits';
/** Levels from here on are Hexapawn games, not path puzzles. */
export const HEX_LEVEL = 7;

export type Piece = 'rook' | 'bishop' | 'knight';

export interface Puzzle {
	n: number;
	piece: Piece;
	start: number;
	stars: number[];
	rocks: number[];
	guard: { piece: 'rook' | 'bishop'; at: number } | null;
	/** Squares the guard watches: landing there is caught. */
	danger: number[];
	/** Fewest moves that take every star. */
	par: number;
	/** Move dots shown from the start (otherwise only after a wrong tap). */
	dots: boolean;
}

const LINES: Record<Exclude<Piece, 'knight'>, [number, number][]> = {
	rook: [[1, 0], [-1, 0], [0, 1], [0, -1]],
	bishop: [[1, 1], [1, -1], [-1, 1], [-1, -1]]
};
const JUMPS: [number, number][] = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/**
 * Squares a piece can land on. `blocked` squares can't be entered or passed (rocks, the guard);
 * `stops` can be landed on but not passed (stars still on the board).
 */
export function moves(piece: Piece, from: number, n: number, blocked: Set<number>, stops: Set<number> = new Set()): number[] {
	const r = Math.floor(from / n), c = from % n;
	const inside = (y: number, x: number) => y >= 0 && y < n && x >= 0 && x < n;
	if (piece === 'knight')
		return JUMPS.filter(([dy, dx]) => inside(r + dy, c + dx)).map(([dy, dx]) => (r + dy) * n + c + dx).filter((s) => !blocked.has(s));
	const out: number[] = [];
	for (const [dy, dx] of LINES[piece])
		for (let y = r + dy, x = c + dx; inside(y, x); y += dy, x += dx) {
			const s = y * n + x;
			if (blocked.has(s)) break;
			out.push(s);
			if (stops.has(s)) break;
		}
	return out;
}

/** Where the player may move now, given which stars are still on the board. Danger squares included. */
export function legal(p: Puzzle, at: number, starsLeft: number[]): number[] {
	return moves(p.piece, at, p.n, blockers(p), new Set(starsLeft));
}
const blockers = (p: Puzzle) => new Set(p.guard ? [...p.rocks, p.guard.at] : p.rocks);

/**
 * Fewest moves from `at` that take all of `starsLeft`, never landing on a danger square, and the
 * first square of one such path (for the hint). dist is Infinity when it can't be done.
 */
export function solve(p: Puzzle, at = p.start, starsLeft = p.stars, avoid = p.danger): { dist: number; next: number | null } {
	const block = blockers(p);
	const bad = new Set(avoid);
	const key = (s: number, left: number[]) => `${s}:${left.join(',')}`;
	const seen = new Set([key(at, starsLeft)]);
	let frontier: { s: number; left: number[]; first: number | null }[] = [{ s: at, left: starsLeft, first: null }];
	for (let d = 0; frontier.length; d++) {
		const nextFrontier: typeof frontier = [];
		for (const { s, left, first } of frontier) {
			if (left.length === 0) return { dist: d, next: first };
			for (const t of moves(p.piece, s, p.n, block, new Set(left))) {
				if (bad.has(t)) continue;
				const rest = left.filter((x) => x !== t);
				const k = key(t, rest);
				if (seen.has(k)) continue;
				seen.add(k);
				nextFrontier.push({ s: t, left: rest, first: first ?? t });
			}
		}
		frontier = nextFrontier;
	}
	return { dist: Infinity, next: null };
}

interface Spec {
	pieces: Piece[];
	n: number;
	stars: [number, number];
	rocks: [number, number];
	guard: boolean;
	par: [number, number];
	dots: boolean;
}
const SPECS: Record<number, Spec> = {
	1: { pieces: ['rook'], n: 4, stars: [1, 1], rocks: [0, 0], guard: false, par: [1, 2], dots: true },
	2: { pieces: ['rook'], n: 5, stars: [2, 2], rocks: [2, 3], guard: false, par: [3, 5], dots: true },
	3: { pieces: ['bishop'], n: 5, stars: [1, 2], rocks: [1, 2], guard: false, par: [2, 4], dots: true },
	4: { pieces: ['knight'], n: 5, stars: [1, 1], rocks: [0, 0], guard: false, par: [2, 3], dots: true },
	5: { pieces: ['knight'], n: 5, stars: [2, 2], rocks: [1, 2], guard: false, par: [3, 5], dots: false },
	6: { pieces: ['rook', 'knight'], n: 5, stars: [1, 1], rocks: [0, 1], guard: true, par: [2, 4], dots: false }
};

/** A fresh puzzle for levels 1–6: solvable, within the level's par range, and on level 6 the guard matters. */
export function puzzle(level: number): Puzzle {
	const spec = SPECS[Math.min(Math.max(level, 1), 6)];
	for (;;) {
		const n = spec.n;
		const free = Array.from({ length: n * n }, (_, i) => i).sort(() => Math.random() - 0.5);
		const take = (k: number) => free.splice(0, k);
		const [start] = take(1);
		const stars = take(rand(...spec.stars));
		const rocks = take(rand(...spec.rocks));
		const guard = spec.guard ? { piece: pick<'rook' | 'bishop'>(['rook', 'bishop']), at: take(1)[0] } : null;
		const p: Puzzle = { n, piece: pick(spec.pieces), start, stars, rocks, guard, danger: [], par: 0, dots: spec.dots };
		if (guard) {
			// The guard sees along its lines until a rock; stars don't hide anything.
			p.danger = moves(guard.piece, guard.at, n, new Set(rocks));
			if (p.danger.includes(start) || stars.some((s) => p.danger.includes(s))) continue;
		}
		p.par = solve(p).dist;
		if (p.par < spec.par[0] || p.par > spec.par[1]) continue;
		// A guard that changes nothing teaches nothing: the safe way must be longer.
		if (guard && solve(p, start, stars, []).dist >= p.par) continue;
		return p;
	}
}

/* ------------------------------------------------------------------ */
/* Hexapawn (Martin Gardner, 1962): 3×3, three pawns each.             */
/* ------------------------------------------------------------------ */

/** 9 squares, row 0 at the top. 1 = the child's pawns (bottom, moving up), 2 = the computer's. */
export type Hex = (0 | 1 | 2)[];
export type Side = 1 | 2;
export type HexMove = [from: number, to: number];

export const hexStart = (): Hex => [2, 2, 2, 0, 0, 0, 1, 1, 1];
const other = (s: Side): Side => (s === 1 ? 2 : 1);

/** Pawns go one step straight ahead onto an empty square, or one step slanted ahead to take. */
export function hexMoves(b: Hex, side: Side): HexMove[] {
	const dir = side === 1 ? -1 : 1;
	const out: HexMove[] = [];
	b.forEach((v, i) => {
		if (v !== side) return;
		const r = Math.floor(i / 3) + dir, c = i % 3;
		if (r < 0 || r > 2) return;
		if (b[r * 3 + c] === 0) out.push([i, r * 3 + c]);
		for (const dc of [-1, 1]) if (c + dc >= 0 && c + dc <= 2 && b[r * 3 + c + dc] === other(side)) out.push([i, r * 3 + c + dc]);
	});
	return out;
}

export function hexPlay(b: Hex, [from, to]: HexMove): Hex {
	const next = [...b];
	next[to] = next[from];
	next[from] = 0;
	return next;
}

/** Who has won once `mover` has just moved: reaching the far row, or leaving the other side no move. */
export function hexWinner(b: Hex, mover: Side): Side | 0 {
	const far = mover === 1 ? [0, 1, 2] : [6, 7, 8];
	if (far.some((i) => b[i] === mover)) return mover;
	return hexMoves(b, other(mover)).length === 0 ? mover : 0;
}

const memo = new Map<string, Side>();
/** Who wins with best play from here, `toMove` to move. */
export function hexValue(b: Hex, toMove: Side): Side {
	const k = b.join('') + toMove;
	const known = memo.get(k);
	if (known) return known;
	let best: Side = other(toMove);
	for (const m of hexMoves(b, toMove)) {
		const after = hexPlay(b, m);
		const w = hexWinner(after, toMove) || hexValue(after, other(toMove));
		if (w === toMove) {
			best = toMove;
			break;
		}
	}
	memo.set(k, best);
	return best;
}

/**
 * The computer's move. Easy: any move. Smart: a winning move if there is one; otherwise the move that
 * leaves the child the most ways to go wrong. The computer moves first, and with best play the second
 * player always wins Hexapawn, so the child can always win, but only by playing well.
 */
export function hexComputer(b: Hex, smart: boolean): HexMove {
	const all = hexMoves(b, 2);
	if (!smart) return pick(all);
	const scored = all.map((m) => {
		const after = hexPlay(b, m);
		if (hexWinner(after, 2)) return { m, score: 2 };
		const replies = hexMoves(after, 1);
		const losing = replies.filter((r) => {
			const a2 = hexPlay(after, r);
			return !hexWinner(a2, 1) && hexValue(a2, 2) === 2;
		}).length;
		return { m, score: hexValue(after, 1) === 2 ? 1.5 : losing / Math.max(replies.length, 1) };
	});
	const top = Math.max(...scored.map((s) => s.score));
	return pick(scored.filter((s) => s.score === top)).m;
}
