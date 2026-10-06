/** Run: npx tsx tests/score.test.ts — asserts the graded scoring core. */
import { strict as assert } from 'node:assert';
import { NEAR, gradeAttempts, keySimilarity, numberSimilarity } from '../src/lib/score';
import { similarity } from '../src/lib/spell';

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

// Numbers: off-by-one and transpositions are near, wild guesses are far.
assert.equal(numberSimilarity(57, 57), 1);
assert.ok(near(numberSimilarity(56, 57)), 'off by one');
assert.ok(near(numberSimilarity(74, 47)), 'transposed digits');
assert.ok(near(numberSimilarity(8, 7)), 'off by one, small');
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
