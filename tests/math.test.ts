// npx tsx tests/math.test.ts
import { strict as assert } from 'node:assert';
import { PASS_MS, PASS_SETS, counts, isUnlocked, passedSets, questionnaire } from '../src/lib/math';

// A round fills a star when it is under a minute, or, with the clock off, whenever it was finished.
assert.ok(counts(PASS_MS, true) && !counts(PASS_MS + 1, true));
assert.ok(counts(PASS_MS + 30_000, false), 'clock off: any finished round counts');
assert.ok(!counts(undefined, false), 'a round never played is not a star');

const best = { '0-0': 41_800, '0-2': 52_000, '0-3': 74_000 };
assert.equal(passedSets(best, 0, true), 2);
assert.equal(passedSets(best, 0, false), 3);
assert.ok(!isUnlocked(best, 1, true), 'two stars: level 2 still locked');
assert.ok(isUnlocked(best, 1, false), 'clock off: three finished rounds open it');
assert.ok(isUnlocked({ ...best, '0-5': 59_000 }, 1, true), 'a third round under a minute opens it');
assert.equal(PASS_SETS, 3);
assert.deepEqual(questionnaire(0, 1), questionnaire(0, 1), 'a round is the same every time');
console.log('math ok');
