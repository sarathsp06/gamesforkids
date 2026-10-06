import type { Language } from './words';

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
