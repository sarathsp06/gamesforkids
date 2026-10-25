/**
 * Moving progress between devices (design/progress-transfer): one versioned bundle, carried by a QR code over
 * a one-time peer-to-peer room, by a small link, or by a file. Taking one in is always a merge a grown-up
 * confirms. Reads and writes go through storage.ts, so this module runs anywhere `localStorage` exists.
 */
import { AVATARS, MAX_AGE, MIN_AGE, type Player } from './players';
import { CHESS_LEVELS } from './chess';
import { SHAPE_LEVELS } from './shapes';
import { SPELL_LEVELS } from './spell';
import { READ_LEVELS } from './stories';
import { MAX_TIER, STICKERS, type Language } from './words';
import { PICTURES } from './paint';
import {
	GALLERY_MAX, defaultSettings, loadChessLevel, loadGallery, loadLanguage, loadMath, loadPainted, loadPlayLog, loadPlayers,
	loadProgress, loadRead, loadSessions, loadSettings, loadShapeLevel, loadSpellLevel, saveChessLevel, saveLanguage, saveMath,
	savePainted, savePlayLog, savePlayers, saveProgress, saveRead, saveSessions, saveSettings, saveShapeLevel, saveSpellLevel,
	type Play, type SessionStats, type Settings
} from './storage';

export interface Levels {
	letters: number;
	math: Record<string, number>;
	spell: number;
	shapes: number;
	chess: number;
	read: { level: number; next: Record<number, number> };
}

export interface Bundle {
	v: 1;
	made: string;
	language: Language;
	players: Player[];
	/** Sticker books by player id; '' is the book from before players existed. */
	stickers: Record<string, string[]>;
	levels: Levels;
	painted: string[];
	plays: Play[];
	sessions: SessionStats[];
	/** Finished Paint Pot pictures, PNG data URLs, newest first. */
	gallery: string[];
	settings?: Settings;
}

export interface Options {
	/** The play log: the last month (default) or all of it. */
	plays: 'month' | 'all';
	/** Settings stay on each device unless a grown-up asks. */
	settings: boolean;
	/** The small link leaves the pictures out. */
	gallery: boolean;
}
export const DEFAULT_OPTIONS: Options = { plays: 'month', settings: false, gallery: true };
const MONTH_MS = 31 * 86400000;
/** The small link carries at most this many plays, so its QR code stays scannable. */
export const LINK_PLAYS = 100;
/** A gallery picture is a 320 px PNG; anything bigger is not one of ours. */
export const PICTURE_MAX_CHARS = 280_000;

const STICKER_KEY = 'stickers';
const GALLERY_KEY = 'paintGallery';
const readStickers = (): Record<string, string[]> => {
	try {
		const v = JSON.parse(localStorage.getItem(STICKER_KEY) ?? '{}');
		return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
	} catch {
		return {};
	}
};

/** This device's progress as a bundle. */
export function gather(opts: Partial<Options> = {}, now = Date.now()): Bundle {
	const o = { ...DEFAULT_OPTIONS, ...opts };
	const plays = loadPlayLog().filter((p) => o.plays === 'all' || now - new Date(p.at).getTime() <= MONTH_MS);
	const b: Bundle = {
		v: 1,
		made: new Date(now).toISOString(),
		language: loadLanguage(),
		players: loadPlayers().list,
		stickers: readStickers(),
		levels: {
			letters: loadProgress().tier,
			math: loadMath().best,
			spell: loadSpellLevel(),
			shapes: loadShapeLevel(),
			chess: loadChessLevel(),
			read: (({ level, next }) => ({ level, next }))(loadRead())
		},
		painted: loadPainted(),
		plays,
		sessions: loadSessions(),
		gallery: o.gallery ? loadGallery() : []
	};
	if (o.settings) b.settings = loadSettings();
	return b;
}

// Validation: one check for every way in. Anything off refuses the whole bundle.
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const int = (x: unknown, lo: number, hi: number): x is number => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;
const str = (x: unknown, max = 64): x is string => typeof x === 'string' && x.length <= max;
const PICTURE_IDS = new Set(PICTURES.map((p) => p.id));

const validPlayer = (p: unknown): p is Player =>
	isObj(p) && str(p.id, 32) && /^[0-9a-z]+$/.test(p.id as string) && str(p.name, 20) && int(p.avatar, 0, AVATARS.length - 1) &&
	int(p.age, MIN_AGE, MAX_AGE) && (p.mode === undefined || p.mode === 'little' || p.mode === 'big');
const validPlay = (p: unknown): p is Play => isObj(p) && str(p.game, 20) && str(p.at, 40) && !isNaN(Date.parse(p.at as string)) && typeof p.ms === 'number' && p.ms >= 0;
const validSession = (s: unknown): s is SessionStats => isObj(s) && str(s.id, 64) && str(s.date, 40) && typeof s.accuracy === 'number';
const validLevels = (l: unknown): l is Levels =>
	isObj(l) && int(l.letters, 1, MAX_TIER) && int(l.spell, 1, SPELL_LEVELS) && int(l.shapes, 1, SHAPE_LEVELS) && int(l.chess, 1, CHESS_LEVELS) &&
	isObj(l.math) && Object.entries(l.math).every(([k, v]) => /^\d+-\d+$/.test(k) && typeof v === 'number' && v > 0) &&
	isObj(l.read) && int(l.read.level, 1, READ_LEVELS) && isObj(l.read.next) && Object.values(l.read.next).every((v) => int(v, 0, 1000));
const validSettings = (s: unknown): s is Settings => {
	if (!isObj(s) || s.v !== 1) return false;
	const d = defaultSettings();
	return Object.entries(s).every(([k, v]) => k in d && typeof v === typeof d[k as keyof Settings]);
};

export function validate(x: unknown): Bundle | null {
	if (!isObj(x) || x.v !== 1) return null;
	const b = x;
	if (!str(b.made, 40) || (b.language !== 'en' && b.language !== 'nl')) return null;
	if (!Array.isArray(b.players) || b.players.length > 20 || !b.players.every(validPlayer)) return null;
	if (!isObj(b.stickers) || !Object.entries(b.stickers).every(([k, v]) => str(k, 32) && Array.isArray(v) && v.length <= 500 && v.every((s) => typeof s === 'string' && s in STICKERS))) return null;
	if (!validLevels(b.levels)) return null;
	if (!Array.isArray(b.painted) || !b.painted.every((p) => typeof p === 'string' && PICTURE_IDS.has(p))) return null;
	if (!Array.isArray(b.plays) || b.plays.length > 1000 || !b.plays.every(validPlay)) return null;
	if (!Array.isArray(b.sessions) || b.sessions.length > 100 || !b.sessions.every(validSession)) return null;
	if (!Array.isArray(b.gallery) || b.gallery.length > GALLERY_MAX) return null;
	if (!b.gallery.every((g) => typeof g === 'string' && g.startsWith('data:image/png;base64,') && g.length <= PICTURE_MAX_CHARS)) return null;
	if (b.settings !== undefined && !validSettings(b.settings)) return null;
	return b as unknown as Bundle;
}

/** Incoming players who look like a child already here under another id: same name (any case) and age. */
export function lookalikes(incoming: Bundle, local = loadPlayers().list): Record<string, string> {
	const out: Record<string, string> = {};
	for (const p of incoming.players) {
		if (local.some((l) => l.id === p.id)) continue;
		const twin = local.find((l) => l.name.trim().toLowerCase() === p.name.trim().toLowerCase() && l.age === p.age);
		if (twin) out[p.id] = twin.id;
	}
	return out;
}

const union = <T>(a: T[], b: T[]) => [...a, ...b.filter((x) => !a.includes(x))];

/**
 * Two bundles as one: nothing on this device is lost. Players by id (`same` maps an incoming id to a local one
 * the grown-up said is the same child), sticker books joined, the higher level wins, Number Dash keeps the
 * faster time, plays and sessions joined without repeats, pictures joined (newest twelve).
 */
export function merge(local: Bundle, incoming: Bundle, same: Record<string, string> = {}, isNew = local.players.length === 0): Bundle {
	const id = (x: string) => same[x] ?? x;
	const players = [...local.players];
	for (const p of incoming.players) if (!players.some((l) => l.id === id(p.id))) players.push(p);
	const stickers: Record<string, string[]> = { ...local.stickers };
	for (const [k, v] of Object.entries(incoming.stickers)) stickers[id(k)] = union(stickers[id(k)] ?? [], v);
	const math = { ...local.levels.math };
	for (const [k, v] of Object.entries(incoming.levels.math)) math[k] = k in math ? Math.min(math[k], v) : v;
	const next = { ...local.levels.read.next };
	for (const [k, v] of Object.entries(incoming.levels.read.next)) next[Number(k)] = Math.max(next[Number(k)] ?? 0, v);
	const playKey = (p: Play) => `${p.game}@${p.at}`;
	const seen = new Set(local.plays.map(playKey));
	const plays = [...local.plays, ...incoming.plays.filter((p) => !seen.has(playKey(p)))].sort((a, b) => a.at.localeCompare(b.at)).slice(-200);
	const sessionIds = new Set(local.sessions.map((s) => s.id));
	const sessions = [...local.sessions, ...incoming.sessions.filter((s) => !sessionIds.has(s.id))].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
	const out: Bundle = {
		v: 1,
		made: local.made,
		language: isNew ? incoming.language : local.language,
		players,
		stickers,
		levels: {
			letters: Math.max(local.levels.letters, incoming.levels.letters),
			math,
			spell: Math.max(local.levels.spell, incoming.levels.spell),
			shapes: Math.max(local.levels.shapes, incoming.levels.shapes),
			chess: Math.max(local.levels.chess, incoming.levels.chess),
			read: { level: Math.max(local.levels.read.level, incoming.levels.read.level), next }
		},
		painted: union(local.painted, incoming.painted),
		plays,
		sessions,
		gallery: union(local.gallery, incoming.gallery).slice(0, GALLERY_MAX)
	};
	const settings = incoming.settings ?? local.settings;
	if (settings) out.settings = settings;
	return out;
}

/** Writes a merged bundle to this device. Returns how many pictures didn't fit in storage. */
export function apply(b: Bundle): { droppedPictures: number } {
	const players = loadPlayers();
	// Progress before pictures: free the gallery's space first, so a full device never loses a level to a
	// picture. The merged bundle already holds this device's own pictures, so they are written back below.
	localStorage.removeItem(GALLERY_KEY);
	savePlayers({ v: 1, list: b.players, current: players.current && b.players.some((p) => p.id === players.current) ? players.current : null });
	localStorage.setItem(STICKER_KEY, JSON.stringify(b.stickers));
	saveProgress({ ...loadProgress(), tier: b.levels.letters });
	saveMath({ v: 1, best: b.levels.math });
	saveSpellLevel(b.levels.spell);
	saveShapeLevel(b.levels.shapes);
	saveChessLevel(b.levels.chess);
	saveRead({ v: 1, level: b.levels.read.level, next: b.levels.read.next });
	savePainted(b.painted);
	savePlayLog(b.plays);
	saveSessions(b.sessions);
	saveLanguage(b.language);
	if (b.settings) saveSettings(b.settings);
	// Pictures are the big part: keep the newest that fit, as saving a picture does.
	const pics = [...b.gallery];
	while (pics.length) {
		try {
			localStorage.setItem(GALLERY_KEY, JSON.stringify(pics));
			break;
		} catch {
			pics.pop();
		}
	}
	return { droppedPictures: b.gallery.length - pics.length };
}

/** Merges an incoming bundle into this device in one step. */
export function takeIn(incoming: Bundle, same: Record<string, string> = {}, wantSettings = false) {
	const local = gather({ plays: 'all', settings: true });
	const isNew = local.players.length === 0;
	const extra = isNew || wantSettings ? incoming : { ...incoming, settings: undefined };
	return apply(merge(local, extra, same, isNew));
}

// The small link: the bundle without pictures, deflated into the URL fragment.
const b64url = (bytes: Uint8Array) => {
	let s = '';
	for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
	const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
	return new Uint8Array(await out.arrayBuffer());
}

export async function toLink(b: Bundle): Promise<string> {
	const small: Bundle = { ...b, gallery: [], plays: b.plays.slice(-LINK_PLAYS) };
	return b64url(await pipe(new TextEncoder().encode(JSON.stringify(small)), new CompressionStream('deflate-raw')));
}
export async function fromLink(s: string): Promise<Bundle | null> {
	try {
		return validate(JSON.parse(new TextDecoder().decode(await pipe(unb64url(s), new DecompressionStream('deflate-raw')))));
	} catch {
		return null;
	}
}

export const fileName = (d = new Date()) => `gamesforkids-${d.toISOString().slice(0, 10)}.json`;
