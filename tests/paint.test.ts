// npx tsx tests/paint.test.ts
import { strict as assert } from 'node:assert';
import { CHAPTERS, CRAYONS, PICTURES, STAMPS } from '../src/lib/paint';
import { allLines } from '../src/lib/voice-catalog';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

assert.equal(new Set(PICTURES.map((p) => p.id)).size, PICTURES.length, 'unique picture ids');
assert.equal(new Set(CRAYONS.map((c) => c.id)).size, CRAYONS.length, 'unique crayon ids');
assert.equal(new Set(CRAYONS.map((c) => c.hex)).size, CRAYONS.length, 'no two crayons the same colour');
assert.ok(CRAYONS.some((c) => c.hex === '#ffffff'), 'white crayon: the eraser');

for (const ch of CHAPTERS) {
	// A cover shows the first two pictures; a chapter is a short story, not a book.
	assert.ok(ch.pictures.length >= 2 && ch.pictures.length <= 8, `${ch.id}: 2 to 8 pictures`);
	assert.ok(ch.name.en && ch.name.nl, `${ch.id}: named in both languages`);
}
assert.equal(new Set(CHAPTERS.map((c) => c.id)).size, CHAPTERS.length, 'unique chapter ids');

for (const c of CRAYONS) {
	// The flood fill only takes #rrggbb.
	assert.match(c.hex, /^#[0-9a-f]{6}$/, `${c.id}: hex colour`);
	assert.ok(c.name.en && c.name.nl, `${c.id}: named in both languages`);
}

for (const p of PICTURES) {
	// Arc radii and flags are numbers too; every number has to fit the 100×100 grid.
	assert.ok(numbers(p.d).every((n) => n >= 0 && n <= 100), `${p.id}: fits the box`);
	assert.match(p.d, /^M/, `${p.id}: path starts with a move`);
	assert.ok(p.done.en && p.done.nl, `${p.id}: praise in both languages`);
	assert.ok(p.name.en && p.name.nl, `${p.id}: named in both languages`);
}

assert.equal(new Set(STAMPS.map((s) => s.id)).size, STAMPS.length, 'unique shape ids');
for (const s of STAMPS) {
	// Stretched from the 100×100 box to the box the child drags, so it has to fill that box.
	const ns = numbers(s.d);
	assert.ok(ns.every((n) => n >= 0 && n <= 100), `${s.id}: fits the box`);
	assert.match(s.d, /^M/, `${s.id}: path starts with a move`);
	assert.ok(s.name.en && s.name.nl, `${s.id}: named in both languages`);
}

for (const lang of ['en', 'nl'] as const) {
	const ids = new Set(allLines(lang).map((l) => l.id));
	for (const c of CRAYONS) assert.ok(ids.has(`colour.${c.id}`), `${lang}: colour line for ${c.id}`);
	for (const p of PICTURES) assert.ok(ids.has(`paint.done.${p.id}`), `${lang}: praise line for ${p.id}`);
	for (const p of PICTURES) assert.ok(ids.has(`paint.pic.${p.id}`), `${lang}: name line for ${p.id}`);
	for (const c of CHAPTERS) assert.ok(ids.has(`paint.chapter.${c.id}`), `${lang}: name line for ${c.id}`);
	for (const s of STAMPS) assert.ok(ids.has(`paint.shape.${s.id}`), `${lang}: name line for ${s.id}`);
	assert.ok(ids.has('paint.go'), `${lang}: start line`);
}

console.log('paint ok');
