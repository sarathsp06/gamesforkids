// npx tsx tests/presence.test.ts
import { strict as assert } from 'node:assert';
import {
	CODE_PICTURES, FLOOD, Limiter, PENALTY_MS, SHELF_MAX, crayonAt, friendRoom, isCode, labelRegions, newCode, newKey, pairRoom, publicRoom, valid
} from '../src/lib/presence';
import { CRAYONS } from '../src/lib/paint';

// A w×h mask from rows of '#' (outline) and '.' (paper).
const grid = (rows: string[]) => ({ mask: Uint8Array.from(rows.join('').split(''), (c) => (c === '.' ? 1 : 0)), w: rows[0].length, h: rows.length });

{
	// Two boxes side by side: left first in scan order, its seed in the middle of its first run.
	const { mask, w, h } = grid(['#########', '#...#...#', '#...#...#', '#########']);
	const r = labelRegions(mask, w, h, 1);
	assert.equal(r.count, 2);
	assert.deepEqual(r.seeds, [[2, 1], [6, 1]]);
	assert.equal(r.labels[1 * w + 1], 0);
	assert.equal(r.labels[2 * w + 7], 1);
	assert.equal(r.labels[0], -1, 'outline is no region');
}
{
	// A crumb below the size limit is dropped, and the numbering closes up.
	const { mask, w, h } = grid(['#######', '#.#...#', '#######', '#.....#', '#######']);
	const r = labelRegions(mask, w, h, 2);
	assert.equal(r.count, 2, 'the one-pixel island is a crumb');
	assert.deepEqual(r.seeds, [[4, 1], [3, 3]]);
	assert.equal(r.labels[1 * w + 1], -1);
}
{
	// A ring: inside and outside are two regions; growing the line by a pixel keeps the count.
	const ring = (t: number) => {
		const w = 40, h = 40, m = new Uint8Array(w * h);
		for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
			const d = Math.hypot(x - 20, y - 20);
			m[y * w + x] = Math.abs(d - 12) <= t ? 0 : 1;
		}
		return labelRegions(m, w, h, 4).count;
	};
	assert.equal(ring(1), 2);
	assert.equal(ring(2), ring(1), 'a thicker line keeps the count');
}

assert.equal(crayonAt(0xe2, 0x35, 0x2b), CRAYONS.findIndex((c) => c.id === 'red'));
assert.equal(crayonAt(255, 255, 255), CRAYONS.findIndex((c) => c.hex === '#ffffff'), 'white paper reads as the white crayon, which looks the same');
assert.equal(crayonAt(0xe2, 0x35, 0x2c), -1, 'only exact crayon colours count');

// Messages: each good one passes, anything else is refused.
const fills = { v: 1, picture: 'sun', n: 3, fills: [0, -1, 8] };
assert.ok(valid.hi({ v: 1, avatar: 0, screen: 'pictures' }));
assert.ok(valid.pic({ v: 1, id: 'abc123def456', picture: 'sun', n: 3, fills: [0, -1, 8] }));
assert.ok(valid.want({ v: 1 }));
assert.ok(valid.fills(fills));
assert.ok(valid.at({ v: 1, x: 0.5, y: 1 }));
assert.ok(valid.hello({ v: 1, key: newKey(), avatar: 2 }));
assert.ok(valid.open({ v: 1, picture: 'wolf' }));
assert.ok(valid.answer({ v: 1, yes: false }));
assert.ok(!valid.hi({ v: 1, avatar: 0, screen: 'pictures', name: 'Mila' }), 'unknown field');
assert.ok(!valid.hi({ v: 1, avatar: '0', screen: 'pictures' }), 'wrong type');
assert.ok(!valid.hi({ v: 1, avatar: 99, screen: 'pictures' }), 'avatar out of range');
assert.ok(!valid.hi({ v: 2, avatar: 0, screen: 'pictures' }), 'unknown version');
assert.ok(!valid.fills({ ...fills, picture: 'dragon' }), 'unknown picture');
assert.ok(!valid.fills({ ...fills, fills: [0, 1] }), 'too few fills');
assert.ok(!valid.fills({ ...fills, fills: [0, 1, 99] }), 'crayon out of range');
assert.ok(!valid.at({ v: 1, x: 2, y: 0 }), 'position off the picture');
assert.ok(!valid.hello({ v: 1, key: 'hello there', avatar: 0 }), 'a key is hex, never text');
const pic = { v: 1, id: 'abc123def456', picture: 'sun', n: 1, fills: [0] };
assert.ok(valid.list({ v: 1, pics: Array(SHELF_MAX).fill(pic) }));
assert.ok(!valid.list({ v: 1, pics: Array(SHELF_MAX + 1).fill(pic) }), 'a list over the limit');
assert.ok(!valid.pic({ ...pic, id: 'look at me!' }), 'an id is never free text');
assert.ok(!valid.pic(null) && !valid.pic('pic') && !valid.pic([pic]));

// Rate limits: a steady peer passes, a flooding one is ignored for a minute.
{
	const l = new Limiter();
	assert.ok(l.allow('a', 'hi', 0) && l.allow('a', 'hi', 2500));
	assert.ok(!l.allow('a', 'hi', 2600), 'too fast is dropped');
	assert.ok(l.allow('a', 'pic', 2700), 'one fast message is not a ban');
	assert.ok(l.allow('a', 'hi', 4600), 'and the peer is heard again');
	for (let t = 0; t < FLOOD; t++) l.allow('a', 'at', 5000 + t);
	assert.ok(!l.allow('a', 'pic', 50000), 'a flood ignores the peer for a while');
	assert.ok(l.allow('a', 'pic', 5000 + FLOOD + PENALTY_MS), 'and hears it again a minute after the flood');
	assert.ok(l.allow('b', 'hi', 2600), 'other peers are unaffected');
}

// Codes and rooms.
for (let i = 0; i < 50; i++) assert.ok(isCode(newCode()));
assert.ok(!isCode([1, 2, 3]) && !isCode([0, 0, 0, CODE_PICTURES.length]));
const code = [3, 1, 4, 1];
const a = await pairRoom(code, '2026-10-25');
assert.deepEqual(a, await pairRoom(code, '2026-10-25'), 'same code, same day, same room');
assert.notEqual(a.room, (await pairRoom(code, '2026-10-26')).room, 'a new day, a new room');
assert.notEqual(a.room, (await pairRoom([3, 1, 4, 2], '2026-10-25')).room);
const plain = code.join('.');
assert.ok(![a.room, a.password].some((x) => x.includes(plain)), 'the code itself never shows');
assert.notEqual(a.room, publicRoom('en', 0));
const [k1, k2] = [newKey(), newKey()];
assert.deepEqual(await friendRoom(k1, k2), await friendRoom(k2, k1), 'both friends find the same room');
assert.notEqual((await friendRoom(k1, k2)).room, (await friendRoom(k1, newKey())).room);
console.log('presence ok');
