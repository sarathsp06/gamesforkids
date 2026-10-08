/** Run: npx tsx tests/score.test.ts — asserts the graded scoring core. */
import { strict as assert } from 'node:assert';
import { NEAR, gradeAttempts, keySimilarity, numberSimilarity } from '../src/lib/score';
import { choices, similarity, soundAlikes } from '../src/lib/spell';

const near = (s: number) => s >= NEAR;

// Grades: gold first try, silver one near miss, bronze otherwise.
assert.equal(gradeAttempts([]), 'gold');
assert.equal(gradeAttempts([0.9]), 'silver');
assert.equal(gradeAttempts([0.3]), 'bronze');
assert.equal(gradeAttempts([0.9, 0.9]), 'bronze');

// Spelling: phonetic misses are near, different words are far.
assert.ok(near(similarity('KAT', 'CAT', 'en')), 'KAT sounds like CAT');
assert.ok(!near(similarity('MAN', 'CAT', 'en')), 'MAN is not CAT');
assert.ok(near(similarity('APLE', 'APPLE', 'en')), 'dropped double letter');
assert.ok(near(similarity('PENGIUN', 'PENGUIN', 'en')), 'swapped letters');
assert.ok(!near(similarity('MOUSE', 'HOUSE', 'en')), 'different first sound = different word');
assert.ok(near(similarity('KONEIN', 'KONIJN', 'nl')), 'EI/IJ sound alike');
assert.ok(near(similarity('SGOEN', 'SCHOEN', 'nl')), 'G/CH sound alike');
assert.ok(!near(similarity('HOND', 'MAAN', 'nl')), 'unrelated word');

// Spell Pick levels: CAT / KAT / BUS — KAT sounds right, BUS is a different word.
assert.ok(soundAlikes('CAT', 'en').includes('KAT'));
assert.ok(!soundAlikes('SNOW', 'en').includes('ZNOW'), 'Z before a consonant changes the sound');
for (let i = 0; i < 50; i++) {
	const l1 = choices('CAT', 'en', 1).filter((w) => w !== 'CAT');
	assert.ok(l1.every((w) => !near(similarity(w, 'CAT', 'en'))), 'level 1: clearly different words');
	const l3 = choices('CAT', 'en', 3);
	assert.ok(l3.includes('KAT') && l3.includes('CAT'), 'level 3: the sound-alike spelling is offered');
	assert.equal(l3.filter((w) => near(similarity(w, 'CAT', 'en'))).length, 2, 'level 3: other option is far');
}

// Numbers: exact answers only, except a counting slip (±1) or swapped digits.
assert.equal(numberSimilarity(57, 57), 1);
assert.ok(near(numberSimilarity(56, 57)), 'off by one');
assert.ok(near(numberSimilarity(74, 47)), 'transposed digits');
assert.ok(near(numberSimilarity(7, 8)) && near(numberSimilarity(9, 8)), 'counting slip: 7 or 9 for 8');
assert.ok(!near(numberSimilarity(6, 8)), '6 for 5 + 3 is just wrong');
assert.ok(!near(numberSimilarity(67, 57)), 'tens off is not a counting slip');
assert.ok(!near(numberSimilarity(90, 57)), 'far guess');
assert.ok(!near(numberSimilarity(3, 12)), 'far guess, small');
assert.equal(numberSimilarity(NaN, 5), 0);

// Keyboard: neighbours and confusable letters forgivable, random keys not.
assert.equal(keySimilarity('T', 'T'), 1);
assert.ok(near(keySimilarity('R', 'T')), 'neighbour key');
assert.ok(near(keySimilarity('B', 'D')), 'mirror letters');
assert.ok(near(keySimilarity('C', 'K')), 'sound-alike letters');
assert.ok(!near(keySimilarity('Q', 'M')), 'opposite corner');

console.log('score.test.ts: all assertions passed');
