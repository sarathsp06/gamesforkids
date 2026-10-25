// npx tsx tests/transfer.test.ts
import { strict as assert } from 'node:assert';

// A small localStorage for Node, with a quota so "storage full" can be tried.
class Store {
	data = new Map<string, string>();
	quota = Infinity;
	getItem(k: string) { return this.data.get(k) ?? null; }
	setItem(k: string, v: string) {
		const size = [...this.data].reduce((n, [kk, vv]) => n + (kk === k ? 0 : vv.length), 0) + v.length;
		if (size > this.quota) throw new Error('QuotaExceededError');
		this.data.set(k, String(v));
	}
	removeItem(k: string) { this.data.delete(k); }
	clear() { this.data.clear(); }
}
const store = new Store();
(globalThis as { localStorage?: unknown }).localStorage = store;

const { gather, validate, merge, takeIn, lookalikes, toLink, fromLink, LINK_PLAYS } = await import('../src/lib/transfer');
const S = await import('../src/lib/storage');

const png = (n: number) => `data:image/png;base64,${'A'.repeat(n)}`;
function laptop() {
	store.clear();
	S.savePlayers({ v: 1, list: [{ id: 'mila1', name: 'Mila', avatar: 0, age: 4 }, { id: 'sam1', name: 'Sam', avatar: 1, age: 7 }], current: 'mila1' });
	store.setItem('stickers', JSON.stringify({ mila1: ['🐱', '🐶'], sam1: ['🦁'] }));
	S.saveSpellLevel(3);
	S.saveShapeLevel(2);
	S.saveMath({ v: 1, best: { '1-1': 40000, '2-1': 50000 } });
	S.savePainted(['sun', 'wolf']);
	S.saveSettings({ ...S.defaultSettings(), voice: false });
	S.saveLanguage('nl');
	const now = Date.now();
	S.savePlayLog([
		{ game: 'paint', at: new Date(now - 60 * 86400000).toISOString(), ms: 60000 },
		{ game: 'spell', at: new Date(now - 86400000).toISOString(), ms: 120000 }
	]);
	store.setItem('paintGallery', JSON.stringify([png(10), png(20)]));
}

// A bundle survives gather and validate unchanged.
laptop();
const b = gather();
assert.deepEqual(validate(JSON.parse(JSON.stringify(b))), b);
assert.equal(b.plays.length, 1, 'the last month by default');
assert.equal(gather({ plays: 'all' }).plays.length, 2, 'or all of it');
assert.equal(b.settings, undefined, 'settings stay unless asked');
assert.equal(gather({ settings: true }).settings?.voice, false);
assert.equal(b.gallery.length, 2);

// The validator refuses the whole bundle on anything off.
const bad = (patch: object) => validate({ ...JSON.parse(JSON.stringify(b)), ...patch });
assert.equal(bad({ v: 2 }), null, 'unknown version');
assert.equal(bad({ players: [{ id: 'x', name: 'X', avatar: 'zero', age: 4 }] }), null, 'wrong type');
assert.equal(bad({ gallery: Array(13).fill(png(10)) }), null, 'a thirteenth picture');
assert.equal(bad({ gallery: ['data:text/html;base64,PGI+'] }), null, 'not a PNG');
assert.equal(bad({ stickers: { mila1: ['💣'] } }), null, 'not one of our stickers');
assert.equal(bad({ painted: ['dragon'] }), null, 'not one of our pictures');
assert.equal(validate('hello'), null);

// Merge rules.
const phone = {
	...b,
	players: [{ id: 'mila1', name: 'Mila', avatar: 0, age: 4 }, { id: 'noa1', name: 'Noa', avatar: 3, age: 5 }],
	stickers: { mila1: ['🐶', '🐸'], noa1: ['🐢'] },
	levels: { ...b.levels, spell: 2, shapes: 4, math: { '1-1': 35000, '3-1': 70000 } },
	painted: ['pig'],
	plays: [...b.plays, { game: 'math', at: '2026-10-20T10:00:00.000Z', ms: 5000 }],
	gallery: [png(30), png(10)]
};
const m = merge(b, phone);
assert.deepEqual(m.players.map((p) => p.id), ['mila1', 'sam1', 'noa1'], 'players joined by id');
assert.deepEqual(m.stickers.mila1, ['🐱', '🐶', '🐸'], 'sticker books joined');
assert.equal(m.levels.spell, 3, 'the higher level wins');
assert.equal(m.levels.shapes, 4);
assert.deepEqual(m.levels.math, { '1-1': 35000, '2-1': 50000, '3-1': 70000 }, 'Number Dash keeps the faster time');
assert.deepEqual(m.painted, ['sun', 'wolf', 'pig']);
assert.equal(m.plays.length, 2, 'plays joined without repeats');
assert.deepEqual(m.gallery, [png(10), png(20), png(30)], 'pictures joined by content');
assert.deepEqual(merge(m, phone), m, 'a repeated import changes nothing');
assert.equal(merge(b, phone).language, b.language, 'a device with players keeps its language');
assert.equal(merge({ ...b, players: [] }, { ...phone, language: 'en' }).language, 'en', 'a new device takes it');

// The same child set up twice: the grown-up says so, and the books join.
const twin = { ...phone, players: [{ id: 'mila9', name: 'mila', avatar: 2, age: 4 }], stickers: { mila9: ['🦉'] } };
assert.deepEqual(lookalikes(twin, b.players), { mila9: 'mila1' });
const joined = merge(b, twin, { mila9: 'mila1' });
assert.equal(joined.players.length, 2);
assert.deepEqual(joined.stickers.mila1, ['🐱', '🐶', '🦉']);

// takeIn writes through storage; settings only for a new device or when asked.
laptop();
takeIn(validate(JSON.parse(JSON.stringify({ ...phone, settings: { ...S.defaultSettings(), voice: true } })))!);
assert.equal(S.loadPlayers().list.length, 3);
assert.equal(S.loadSpellLevel(), 3);
assert.equal(S.loadSettings().voice, false, 'this device keeps its own settings');
assert.equal(S.loadPlayers().current, 'mila1', 'whoever was playing still is');
store.clear();
takeIn(validate(JSON.parse(JSON.stringify({ ...phone, settings: { ...S.defaultSettings(), voice: false } })))!);
assert.equal(S.loadSettings().voice, false, 'a new device takes them');
assert.equal(S.loadPlayers().list.length, 2);

// Storage full: the newest pictures that fit stay, and the count of the rest comes back.
laptop();
store.quota = [...store.data.values()].reduce((n, v) => n + v.length, 0) + 300;
const { droppedPictures } = takeIn(validate(JSON.parse(JSON.stringify({ ...b, players: [], levels: { ...b.levels, chess: 3 }, gallery: [png(10), png(20), png(400)] })))!);
assert.ok(droppedPictures >= 1, 'the picture that does not fit stays behind');
assert.equal(S.loadChessLevel(), 3, 'progress is written before pictures');
assert.ok(S.loadGallery().length >= 1, 'the pictures that fit are kept');
store.quota = Infinity;

// The small link round-trips and leaves the pictures behind.
laptop();
const big = { ...gather({ plays: 'all' }), plays: Array.from({ length: 300 }, (_, i) => ({ game: 'spell', at: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), ms: 9000 })) };
const link = await toLink(big);
assert.match(link, /^[A-Za-z0-9_-]+$/, 'safe in a URL fragment');
const back = await fromLink(link);
assert.ok(back);
assert.equal(back!.gallery.length, 0);
assert.equal(back!.plays.length, LINK_PLAYS);
assert.deepEqual(back!.players, big.players);
assert.equal(await fromLink('not-a-link'), null);
console.log('transfer ok', `(small link ${link.length} chars)`);
