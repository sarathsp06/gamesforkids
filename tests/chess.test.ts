// npx tsx tests/chess.test.ts
import { strict as assert } from 'node:assert';
import {
	hexComputer, hexMoves, hexPlay, hexStart, hexValue, hexWinner, legal, moves, puzzle, solve, type Hex, type Side
} from '../src/lib/chess';

// Move rules on an empty 5×5 board, from the centre (12).
assert.deepEqual(moves('rook', 12, 5, new Set()).sort((a, b) => a - b), [2, 7, 10, 11, 13, 14, 17, 22]);
assert.deepEqual(moves('bishop', 12, 5, new Set()).sort((a, b) => a - b), [0, 4, 6, 8, 16, 18, 20, 24]);
assert.deepEqual(moves('knight', 12, 5, new Set()).sort((a, b) => a - b), [1, 3, 5, 9, 15, 19, 21, 23]);
assert.deepEqual(moves('knight', 0, 4, new Set()).sort((a, b) => a - b), [6, 9], 'knight in the corner of 4×4');
// A rock stops a line; a star can be landed on but not passed.
assert.deepEqual(moves('rook', 0, 5, new Set([2]), new Set([10])).sort((a, b) => a - b), [1, 5, 10]);
// A knight jumps over rocks but can't land on one.
assert.ok(!moves('knight', 12, 5, new Set([1, 7])).includes(1));
assert.ok(moves('knight', 12, 5, new Set([7])).includes(1));

const PAR: Record<number, [number, number]> = { 1: [1, 2], 2: [3, 5], 3: [2, 4], 4: [2, 3], 5: [3, 5], 6: [2, 4] };
for (let i = 0; i < 300; i++) {
	for (let level = 1; level <= 6; level++) {
		const p = puzzle(level);
		assert.ok(p.par >= PAR[level][0] && p.par <= PAR[level][1], `level ${level}: par ${p.par} in range`);
		const all = [p.start, ...p.stars, ...p.rocks, ...(p.guard ? [p.guard.at] : [])];
		assert.equal(new Set(all).size, all.length, 'nothing shares a square');
		// Following the hint from the start reaches every star in exactly par moves, never into danger.
		let at = p.start, left = p.stars, steps = 0;
		while (left.length) {
			const { next } = solve(p, at, left);
			assert.ok(next !== null && legal(p, at, left).includes(next), 'hint is a legal move');
			assert.ok(!p.danger.includes(next!), 'hint never walks into danger');
			at = next!;
			left = left.filter((s) => s !== at);
			steps++;
		}
		assert.equal(steps, p.par, `level ${level}: hint path is par long`);
		if (level === 6) {
			assert.ok(p.guard, 'level 6 has a guard');
			assert.ok(solve(p, p.start, p.stars, []).dist < p.par, 'the guard makes the safe way longer');
		}
	}
}

// Hexapawn: the second player wins with best play, so the child (moving second) always can.
const start = hexStart();
assert.equal(hexMoves(start, 2).length, 3);
assert.equal(hexValue(start, 2), 1, 'second player wins Hexapawn');
for (const m of hexMoves(start, 2)) assert.equal(hexValue(hexPlay(start, m), 1), 1, 'child wins after any first move');

// Random child vs smart computer: games end, and the computer never makes an illegal move.
let childWins = 0;
for (let g = 0; g < 500; g++) {
	let b: Hex = start, mover: Side = 2, winner: Side | 0 = 0;
	while (!winner) {
		const m = mover === 2 ? hexComputer(b, true) : hexMoves(b, 1)[Math.floor(Math.random() * hexMoves(b, 1).length)];
		assert.ok(hexMoves(b, mover).some(([f, t]) => f === m[0] && t === m[1]), 'legal move');
		b = hexPlay(b, m);
		winner = hexWinner(b, mover);
		mover = mover === 1 ? 2 : 1;
	}
	if (winner === 1) childWins++;
}
assert.ok(childWins < 250, `smart computer beats a random child most of the time (child won ${childWins}/500)`);

// Perfect child vs smart computer: always wins.
for (let g = 0; g < 200; g++) {
	let b: Hex = start, mover: Side = 2, winner: Side | 0 = 0;
	while (!winner) {
		const m = mover === 2
			? hexComputer(b, true)
			: hexMoves(b, 1).find((m) => { const a = hexPlay(b, m); return hexWinner(a, 1) === 1 || hexValue(a, 2) === 1; })!;
		b = hexPlay(b, m);
		winner = hexWinner(b, mover);
		mover = mover === 1 ? 2 : 1;
	}
	assert.equal(winner, 1, 'best play by the child always wins');
}
console.log(`chess.test.ts: all assertions passed (random child won ${childWins}/500 vs smart computer)`);
