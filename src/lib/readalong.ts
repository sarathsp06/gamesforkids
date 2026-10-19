/**
 * Read Along: match what speech recognition heard against the sentence the child is reading.
 *
 * Children's speech is recognised badly, but we know the text, so we don't need a good transcript: heard
 * words are compared in order with the expected ones, leniently (Spell Pick's phonetic similarity), and a
 * dropped short word is forgiven when the word after it is heard. Matching only moves forward.
 */
import type { Grade } from './score';
import { similarity } from './spell';
import type { Language } from './words';

export interface Word {
	/** As shown, with its punctuation: "Wolf!" */
	shown: string;
	/** For matching: lower case letters only: "wolf" */
	key: string;
}

/** Lower case, letters only (accents kept: één). */
export const wordKey = (w: string) => w.toLowerCase().replace(/[^\p{L}]/gu, '');

export function words(sentence: string): Word[] {
	return sentence
		.split(/\s+/)
		.filter(Boolean)
		.map((shown) => ({ shown, key: wordKey(shown) }))
		.filter((w) => w.key);
}

/** Recognised text as keys; recognisers may write numbers as digits, which never match and are dropped. */
export const heardKeys = (transcript: string) => transcript.split(/\s+/).map(wordKey).filter(Boolean);

/** How alike a heard word must be to the expected one. "kat" for "cat" is 0.83. */
export const MATCH = 0.65;

export function sameWord(heard: string, expected: string, lang: Language): boolean {
	if (heard === expected) return true;
	// Strip accents for the phonetic measure: recognisers drop them (een / één).
	const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
	return similarity(plain(heard), plain(expected), lang) >= MATCH;
}

/**
 * How many words of the sentence are read, starting from `from` (already read or helped), given the words
 * heard since then. Each heard word either matches the next expected word, or the one after it (the word
 * in between was dropped by the recogniser, usually a short one like "a" or "de"); anything else is ignored.
 */
export function align(sentence: Word[], heard: string[], from: number, lang: Language): number {
	let at = from;
	for (const h of heard) {
		if (at >= sentence.length) break;
		if (sameWord(h, sentence[at].key, lang)) at++;
		else if (at + 1 < sentence.length && sameWord(h, sentence[at + 1].key, lang)) at += 2;
	}
	return at;
}

/** How a word was read: alone, after it glowed, or the game said it. */
export type WordState = 'read' | 'glowed' | 'said';
export const WORD_GRADE: Record<WordState, Grade> = { read: 'gold', glowed: 'silver', said: 'bronze' };

/** A sentence: every word read alone is gold; no word said for the child is silver; else bronze. */
export function sentenceGrade(states: WordState[]): Grade {
	if (states.every((s) => s === 'read')) return 'gold';
	return states.includes('said') ? 'bronze' : 'silver';
}

/** For read-to-me mode: when each word starts, in seconds, for a sentence that takes `total` seconds. */
export function wordStarts(sentence: Word[], total: number): number[] {
	// Longer words take longer; every word also has a small fixed cost.
	const weight = sentence.map((w) => w.key.length + 2);
	const sum = weight.reduce((a, b) => a + b, 0);
	let t = 0;
	return weight.map((w) => {
		const start = t;
		t += (w / sum) * total;
		return start;
	});
}
