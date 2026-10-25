import type { Language } from './words';
import { CHESS_LEVELS, READ_LEVELS, SHAPE_LEVELS } from './limits';

// Keys shared with the old Next.js app: existing players keep their history and language.
const SESSIONS = 'letterLeapSessions';
const LANGUAGE = 'letterLeapLanguage';
const PROGRESS = 'letterLeapProgress';

export interface SessionStats {
	id: string;
	date: string; // ISO
	accuracy: number; // percent, 2 decimals
	wpm: number;
	lettersTyped: number;
	wordsTyped: number;
	durationMinutes: number;
	longestStreak: number;
	tier?: number;
	language?: Language;
	stickers?: number;
}

export interface Progress {
	v: 1;
	tier: number;
	tierMode: 'auto' | 'pinned';
	stickers: string[];
	sound: boolean;
}

const read = <T>(key: string, fallback: T): T => {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
};
const write = (key: string, value: unknown) => {
	try {
		localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
	} catch (e) {
		console.error(`Failed to save ${key}`, e);
	}
};

export const loadSessions = () => read<SessionStats[]>(SESSIONS, []);
export const saveSessions = (s: SessionStats[]) => write(SESSIONS, s);

export const loadLanguage = (): Language => {
	const l = localStorage.getItem(LANGUAGE);
	return l === 'nl' || l === 'en' ? l : 'en';
};
export const saveLanguage = (l: Language) => write(LANGUAGE, l);

export const defaultProgress = (): Progress => ({ v: 1, tier: 1, tierMode: 'auto', stickers: [], sound: true });
export const loadProgress = (): Progress => {
	const p = read<Partial<Progress> | null>(PROGRESS, null);
	// Unknown or broken progress resets only this key, never the history.
	return p?.v === 1 ? { ...defaultProgress(), ...p } : defaultProgress();
};
export const saveProgress = (p: Progress) => write(PROGRESS, p);

/** Number Dash: best finishing time in ms per questionnaire, keyed `${level}-${set}`. */
export interface MathProgress {
	v: 1;
	best: Record<string, number>;
}
const MATH = 'mathProgress';
export const loadMath = (): MathProgress => {
	const p = read<Partial<MathProgress> | null>(MATH, null);
	return p?.v === 1 && p.best && typeof p.best === 'object' ? { v: 1, best: p.best } : { v: 1, best: {} };
};
export const saveMath = (p: MathProgress) => write(MATH, p);

/** Spell Pick: current level 1–4. */
const SPELL = 'spellLevel';
export const loadSpellLevel = (): number => Math.max(1, Math.min(4, Number(read<number>(SPELL, 1)) || 1));
export const saveSpellLevel = (l: number) => write(SPELL, String(l));

/** Shape Sense: current level 1–SHAPE_LEVELS. */
const SHAPES = 'shapeLevel';
export const loadShapeLevel = (): number => Math.max(1, Math.min(SHAPE_LEVELS, Number(read<number>(SHAPES, 1)) || 1));
export const saveShapeLevel = (l: number) => write(SHAPES, String(l));

/** Chess Path: current level 1–CHESS_LEVELS. */
const CHESS = 'chessLevel';
export const loadChessLevel = (): number => Math.max(1, Math.min(CHESS_LEVELS, Number(read<number>(CHESS, 1)) || 1));
export const saveChessLevel = (l: number) => write(CHESS, String(l));

/** Read Along: level 1–READ_LEVELS and the next story per level. */
const READ = 'readAlong';
export interface ReadProgress {
	v: 1;
	level: number;
	next: Record<number, number>;
}
export const loadRead = (): ReadProgress => {
	const p = read<Partial<ReadProgress> | null>(READ, null);
	if (p?.v !== 1) return { v: 1, level: 1, next: {} };
	return { v: 1, level: Math.max(1, Math.min(READ_LEVELS, Number(p.level) || 1)), next: p.next ?? {} };
};
export const saveRead = (p: ReadProgress) => write(READ, p);

/** Paint Pot: finished pictures as small PNG data URLs, newest first. */
const GALLERY = 'paintGallery';
export const GALLERY_MAX = 12;
export const loadGallery = (): string[] => {
	const g = read<unknown>(GALLERY, []);
	return Array.isArray(g) ? g.filter((x): x is string => typeof x === 'string').slice(0, GALLERY_MAX) : [];
};
/** Adds a picture; when storage is full, drops the oldest until it fits. False if it never fits. */
export function addToGallery(picture: string): boolean {
	const all = [picture, ...loadGallery()].slice(0, GALLERY_MAX);
	while (all.length) {
		try {
			localStorage.setItem(GALLERY, JSON.stringify(all));
			return true;
		} catch {
			if (all.length === 1) return false;
			all.pop();
		}
	}
	return false;
}

/** Paint Pot: ids of the pictures finished at least once, for a star on their card. */
const PAINTED = 'paintDone';
export const loadPainted = (): string[] => {
	const d = read<unknown>(PAINTED, []);
	return Array.isArray(d) ? d.filter((x): x is string => typeof x === 'string') : [];
};
export const savePainted = (ids: string[]) => write(PAINTED, ids);

/** Players on this device and who is playing now. */
import { modeFor, type Player } from './players';
const PLAYERS = 'players';
export interface Players {
	v: 1;
	list: Player[];
	current: string | null;
}
export const loadPlayers = (): Players => {
	const p = read<Partial<Players> | null>(PLAYERS, null);
	if (p?.v !== 1 || !Array.isArray(p.list)) return { v: 1, list: [], current: null };
	const list = p.list.filter((x): x is Player => !!x && typeof x.id === 'string' && typeof x.age === 'number');
	return { v: 1, list, current: list.some((x) => x.id === p.current) ? p.current! : null };
};
export const savePlayers = (p: Players) => write(PLAYERS, p);
export const currentPlayer = (): Player | null => {
	const p = loadPlayers();
	return p.list.find((x) => x.id === p.current) ?? null;
};
/** Little or Big for whoever is playing; Big when nobody is chosen yet. */
export const currentMode = () => {
	const p = currentPlayer();
	return p ? modeFor(p) : 'big';
};

/** Grown-up settings shared by every game. */
const SETTINGS = 'settings';
export interface Settings {
	v: 1;
	/** Pip's recorded and browser voice. */
	voice: boolean;
	/** The little sounds: tok, bloop, chime. */
	sound: boolean;
	/**
	 * Number Dash's clock, on by default: a round under a minute fills a star towards the next level, and the
	 * child should see that. Off, the clock and the times go, and any finished round fills a star. (Named
	 * anew from `timers`, which was off by default, so every device starts with the clock on once.)
	 */
	clock: boolean;
	/** How fast Pip talks: calm is the recorded pace, normal a little quicker. */
	pace: 'calm' | 'normal';
	/** Paint Pot shows other children and their pictures, through encrypted relay messages. Off until a grown-up turns it on. */
	online: boolean;
}
export const defaultSettings = (): Settings => ({ v: 1, voice: true, sound: true, clock: true, pace: 'calm', online: false });
export const loadSettings = (): Settings => {
	const s = read<Partial<Settings> | null>(SETTINGS, null);
	return s?.v === 1 ? { ...defaultSettings(), ...s } : defaultSettings();
};
export const saveSettings = (s: Settings) => write(SETTINGS, s);

/** A short log of play: one entry per visit to a game, for the grown-ups' week view. Newest 200 kept. */
const PLAYLOG = 'playLog';
export interface Play {
	game: string;
	at: string; // ISO start
	ms: number;
}
export const loadPlayLog = (): Play[] => {
	const l = read<unknown>(PLAYLOG, []);
	return Array.isArray(l) ? l.filter((x): x is Play => !!x && typeof x.game === 'string' && typeof x.ms === 'number') : [];
};
export const savePlayLog = (l: Play[]) => write(PLAYLOG, l.slice(-200));
