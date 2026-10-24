// npx tsx tests/players.test.ts
import { strict as assert } from 'node:assert';
import { AVATARS, GAMES, LITTLE_MAX_AGE, MAX_AGE, MIN_AGE, gamesFor, modeFor } from '../src/lib/players';
import { week } from '../src/lib/playlog';
import { allLines } from '../src/lib/i18n';

// Age picks the mode; a pinned mode wins.
for (let age = MIN_AGE; age <= MAX_AGE; age++) {
	assert.equal(modeFor({ age }), age <= LITTLE_MAX_AGE ? 'little' : 'big', `age ${age}`);
	assert.equal(modeFor({ age, mode: 'big' }), 'big', 'pinned big');
	assert.equal(modeFor({ age, mode: 'little' }), 'little', 'pinned little');
}

// Little mode leaves out the games that need reading; Big shows everything, in the same order.
const little = gamesFor('little').map((g) => g.id);
assert.ok(!little.includes('chess') && !little.includes('read'), 'Little hides chess and reading');
assert.ok(little.includes('spell') && little.includes('paint'), 'Little keeps the tap games');
assert.deepEqual(gamesFor('big').map((g) => g.id), GAMES.map((g) => g.id));
assert.equal(new Set(GAMES.map((g) => g.id)).size, GAMES.length, 'unique game ids');
assert.ok(AVATARS.length >= 4, 'a few faces to pick from');

// Every game has a spoken name in both languages, so a tile can say its own label.
for (const lang of ['en', 'nl'] as const) {
	const ids = new Set(allLines(lang).map((l) => l.id));
	for (const g of GAMES) assert.ok(ids.has(`game.${g.id}`), `${lang}: name line for ${g.id}`);
	for (const k of ['home.who', 'home.what', 'home.try', 'home.done']) assert.ok(ids.has(k), `${lang}: ${k}`);
}

// The week view: seven days ending today, minutes summed per day and per game, older play ignored.
const now = new Date('2026-10-24T18:00:00Z');
const day = (d: number, h = 10) => new Date(Date.UTC(2026, 9, d, h)).toISOString();
const w = week(
	[
		{ game: 'spell', at: day(24), ms: 120000 },
		{ game: 'spell', at: day(24, 12), ms: 60000 },
		{ game: 'math', at: day(20), ms: 300000 },
		{ game: 'read', at: day(10), ms: 999999 } // two weeks ago
	],
	now
);
assert.equal(w.days.length, 7);
assert.equal(Math.round(w.days[6].minutes), 3, 'today: 2 + 1 minutes');
assert.equal(Math.round(w.days[2].minutes), 5, 'four days ago: 5 minutes');
assert.deepEqual(Object.keys(w.games).sort(), ['math', 'spell']);
assert.equal(Math.round(w.games.spell), 3);

console.log('players ok');
