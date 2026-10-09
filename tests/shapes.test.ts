// npx tsx tests/shapes.test.ts
import { strict as assert } from 'node:assert';
import { NEAR } from '../src/lib/score';
import { SHAPE_LEVELS, question, shape } from '../src/lib/shapes';

const corners = (d: string) => (d.match(/[MLQ]/g) ?? []).length;
const inBox = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number).every((n) => n >= -1 && n <= 101);

for (let i = 0; i < 200; i++) {
	// A triangle keeps 3 corners however it is turned or stretched; everything fits the box.
	assert.equal(corners(shape('triangle', 'red', false).d), 3);
	assert.equal(corners(shape('square', 'red', false).d), 4);
	assert.ok(!shape('triangle', 'red', false, 'gap').closed, 'a gap shape is open');
	for (let level = 1; level <= SHAPE_LEVELS; level++) {
		const q = question(level);
		const right = q.options.filter((o) => o.sim === 1);
		const near = q.options.filter((o) => o.sim >= NEAR && o.sim < 1);
		assert.equal(right.length, 1, `level ${level}: exactly one right answer`);
		assert.equal(new Set(q.options.map((o) => o.id)).size, q.options.length, 'unique ids');
		assert.ok(q.options.every((o) => inBox(o.d)) || level === 3, `level ${level}: shapes fit the box`);
		if (level <= 2) assert.ok(q.options.every((o) => (o.kind === q.kind) === (o.sim === 1)), 'only the answer is the asked shape');
		if (level >= 6) {
			const want = level === 6 ? 'circle' : 'triangle';
			const counted = q.picture.filter((p) => p.shape.kind === want).length;
			assert.equal(right[0].n, counted, `level ${level}: right number = shapes in the picture`);
			assert.equal(Math.abs(near[0].n! - counted), 1, 'almost = off by one');
			assert.ok(q.options.every((o) => o.n! >= 1), 'no zero or negative counts');
			if (level === 6) {
				// Every circle overlaps its neighbour: a real chain, not loose dots.
				const ps = q.picture;
				for (let j = 1; j < ps.length; j++) {
					const r = (+ps[j].shape.d.split(' A')[1].split(' ')[0]);
					assert.ok(Math.hypot(ps[j].x - ps[j - 1].x, ps[j].y - ps[j - 1].y) < 2 * r, 'neighbours overlap');
					assert.ok(ps.every((p) => p.x - r >= 0 && p.x + r <= 100), 'chain fits the frame');
				}
			}
		}
		if (level === 3) {
			assert.equal(near.length, 1, 'level 3: one look-alike');
			assert.equal(near[0].kind, q.kind, 'the look-alike is a broken version of the asked shape');
		}
		if (level === 4) {
			assert.equal(q.options.filter((o) => o.kind === right[0].kind).length, 1, 'odd one is unique');
		}
		if (level === 5) {
			assert.equal(q.row.length, 5);
			assert.equal(near[0].kind, right[0].kind, 'almost = right shape');
			assert.notEqual(near[0].color, right[0].color, 'almost = wrong colour');
		}
	}
}
console.log('shapes.test.ts: all assertions passed');
