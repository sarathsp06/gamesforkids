// npx tsx tests/readalong.test.ts
import { strict as assert } from 'node:assert';
import { align, heardKeys, sameWord, sentenceGrade, wordStarts, words } from '../src/lib/readalong';
import { STORIES, READ_LEVELS } from '../src/lib/stories';

const s = words('"Let me go," says the mouse.');
assert.deepEqual(s.map((w) => w.key), ['let', 'me', 'go', 'says', 'the', 'mouse']);
assert.equal(s[2].shown, 'go,"');

// In order, leniently: a sound-alike counts, a dropped short word is forgiven, noise is ignored.
assert.equal(align(s, heardKeys('let me go says the mouse'), 0, 'en'), 6);
assert.equal(align(s, heardKeys('let me go says mouse'), 0, 'en'), 6, '"the" dropped by the recogniser');
assert.equal(align(s, heardKeys('um let uh me'), 0, 'en'), 2, 'filler words are ignored');
assert.equal(align(s, heardKeys('mouse the says'), 0, 'en'), 0, 'out of order does not count');
assert.equal(align(s, heardKeys('go says'), 2, 'en'), 4, 'continues from where it was');
assert.ok(sameWord('kat', 'cat', 'en'), 'kat for cat');
assert.ok(sameWord('een', 'één', 'nl'), 'accents dropped by the recogniser');
assert.ok(!sameWord('dog', 'cat', 'en'));
assert.equal(align(words('De leeuw slaapt.'), heardKeys('de leeuw slaap'), 0, 'nl'), 3, 'Dutch, last sound clipped');

assert.equal(sentenceGrade(['read', 'read']), 'gold');
assert.equal(sentenceGrade(['read', 'glowed']), 'silver');
assert.equal(sentenceGrade(['read', 'said']), 'bronze');

const starts = wordStarts(s, 3);
assert.equal(starts[0], 0);
assert.ok(starts.every((t, i) => i === 0 || t > starts[i - 1]) && starts.at(-1)! < 3, 'word starts increase within the sentence');

// Stories: both languages, every level has one, sentences fit the level, no digits.
const MAX_WORDS = [0, 5, 7, 10, 16]; // the design: 1 three to five words, 2 up to seven, 3 up to ten, 4 longer
for (let level = 1; level <= READ_LEVELS; level++) assert.ok(STORIES.some((st) => st.level === level), `level ${level} has a story`);
assert.equal(new Set(STORIES.map((st) => st.id)).size, STORIES.length);
for (const st of STORIES)
	for (const lang of ['en', 'nl'] as const) {
		const ss = st.sentences[lang];
		assert.ok(ss.length >= 5 && ss.length <= 9, `${st.id} ${lang}: 5–9 sentences`);
		for (const { text, scene } of ss) {
			assert.ok(!/\d/.test(text), `${st.id}: no digits in "${text}"`);
			assert.ok(scene.length > 0);
			assert.ok(words(text).length <= MAX_WORDS[st.level], `${st.id} ${lang} level ${st.level}: "${text}" is ${words(text).length} words`);
		}
	}
console.log('readalong.test.ts: all assertions passed');
