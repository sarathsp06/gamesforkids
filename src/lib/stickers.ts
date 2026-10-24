/**
 * One sticker book for every game. A finished round earns a sticker, preferring ones not owned yet; the
 * book lives in the Letter Leap progress key, so returning players keep what they had.
 */
import { STICKERS } from './words';
import { loadProgress, saveProgress } from './storage';

const random = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Picks and saves a sticker for a finished round; returns its emoji key. */
export function awardSticker(): string {
	const progress = loadProgress();
	const all = Object.keys(STICKERS);
	const fresh = all.filter((s) => !progress.stickers.includes(s));
	const sticker = random(fresh.length ? fresh : all);
	saveProgress({ ...progress, stickers: [...progress.stickers, sticker] });
	return sticker;
}

export const stickerCount = () => loadProgress().stickers.length;
