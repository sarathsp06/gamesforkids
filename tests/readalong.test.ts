// npx tsx tests/readalong.test.ts
import { strict as assert } from 'node:assert';
import { align, heardKeys, sameWord, sentenceGrade, wordStarts, words } from '../src/lib/readalong';
import { STORIES, READ_LEVELS } from '../src/lib/stories';

const s = words('"Let me go," says the mouse.');
assert.deepEqual(s.map((w) => w.key), ['let', 'me', 'go', 'says', 'the', 'mouse']);
assert.equal(s[2].shown, 'go,"');

// In order, leniently: a sound-alike counts, a dropped short word is forgiven, noise is ignored.
const at = (h: string, from = 0, sen = s, lang: 'en' | 'nl' = 'en') => align(sen, heardKeys(h), from, lang).at;
assert.equal(at('let me go says the mouse'), 6);
assert.equal(at('let me go says mouse'), 6, '"the" dropped by the recogniser');
assert.equal(at('um let uh me'), 2, 'filler words are ignored');
assert.equal(at('mouse the says'), 0, 'out of order does not count');
assert.equal(at('go says', 2), 4, 'continues from where it was');
// A word still being said counts once it is clearly started, but only as the last word heard.
const lion = words('The lion is asleep.');
assert.equal(at('the lion is asl', 0, lion), 4, '"asl…" of asleep, still being said');
assert.equal(at('the lion is as', 0, lion), 3, 'too little of the word yet');
// Reading straight on: words past the end are left for the next sentence.
const r = align(lion, heardKeys('the lion is asleep a mouse'), 0, 'en');
assert.deepEqual(r, { at: 4, used: 4 });
assert.equal(align(words('A mouse runs on him.'), heardKeys('the lion is asleep a mouse').slice(r.used), 0, 'en').at, 2);
assert.ok(sameWord('kat', 'cat', 'en'), 'kat for cat');
assert.ok(sameWord('een', 'één', 'nl'), 'accents dropped by the recogniser');
assert.ok(!sameWord('dog', 'cat', 'en'));
assert.equal(at('de leeuw slaap', 0, words('De leeuw slaapt.'), 'nl'), 3, 'Dutch, last sound clipped');

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
