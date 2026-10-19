// npx tsx tests/i18n.test.ts
import { strict as assert } from 'node:assert';
import { allLines, t, textHash, word } from '../src/lib/i18n';
import manifest from '../src/lib/voice-manifest.json';

for (const lang of ['en', 'nl'] as const) {
	const lines = allLines(lang);
	const ids = lines.map((l) => l.id);
	assert.equal(new Set(ids).size, ids.length, `${lang}: line ids are unique`);
	assert.ok(lines.every((l) => /^[\w.-]+$/.test(l.id)), `${lang}: ids are safe file names`);
	assert.ok(lines.every((l) => l.text.trim().length > 0), `${lang}: no empty lines`);
	// Everything a game can build is in the list the generator renders.
	const has = (id: string) => ids.includes(id);
	assert.ok(has(t(lang, 'praise').id) && has(t(lang, 'chess.canDoIn', 5).id) && has(t(lang, 'count', 9).id));
	assert.ok(has(word('CAT').id) || has(word('KAT').id));
	// A recorded clip is only used for the exact text it was made from.
	const m = (manifest as Record<string, Record<string, string>>)[lang];
	for (const id of Object.keys(m)) assert.ok(has(id), `${lang}: manifest id ${id} still exists`);
	if (lang === 'en') assert.ok(lines.length > 200);
}
// Both languages have the same keys (TypeScript checks the catalog; this checks the expansion).
const keys = (lang: 'en' | 'nl') => new Set(allLines(lang).filter((l) => !/^(word|letter|animal|praise|almost|sword)\./.test(l.id)).map((l) => l.id));
assert.deepEqual([...keys('en')].sort(), [...keys('nl')].sort(), 'same catalog keys in English and Dutch');
assert.notEqual(textHash('kat'), textHash('kat.'));
console.log('i18n.test.ts: all assertions passed');
