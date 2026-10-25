/**
 * One sticker book for every game, and one per player: a finished round earns the player a sticker,
 * preferring ones they don't own yet. Stickers earned before players existed stay with the first player.
 */
import { STICKERS } from './words';
import { loadPlayers, loadProgress, saveProgress } from './storage';

const random = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const KEY = 'stickers';

const read = (): Record<string, string[]> => {
	try {
		const raw = localStorage.getItem(KEY);
		const v = raw ? JSON.parse(raw) : {};
		return v && typeof v === 'object' ? v : {};
	} catch {
		return {};
	}
};
const write = (books: Record<string, string[]>) => {
	try {
		localStorage.setItem(KEY, JSON.stringify(books));
	} catch (e) {
		console.error('Failed to save stickers', e);
	}
};

/** The current player's id; the legacy book (before players) is keyed by an empty string. */
const who = () => loadPlayers().current ?? '';

/** Moves the old device-wide book (Letter Leap's progress) to the first player, once. */
function migrate(books: Record<string, string[]>): Record<string, string[]> {
	const legacy = loadProgress();
	if (!legacy.stickers.length) return books;
	const first = loadPlayers().list[0]?.id ?? '';
	books[first] = [...(books[first] ?? []), ...legacy.stickers];
	saveProgress({ ...legacy, stickers: [] });
	write(books);
	return books;
}

export const loadStickers = (): string[] => migrate(read())[who()] ?? [];

/** Picks and saves a sticker for a finished round; returns its emoji key. */
export function awardSticker(): string {
	const books = migrate(read());
	const owned = books[who()] ?? [];
	const all = Object.keys(STICKERS);
	const fresh = all.filter((s) => !owned.includes(s));
	const sticker = random(fresh.length ? fresh : all);
	books[who()] = [...owned, sticker];
	write(books);
	return sticker;
}

export function resetStickers() {
	const books = read();
	delete books[who()];
	write(books);
}

export const stickerCount = () => loadStickers().length;
