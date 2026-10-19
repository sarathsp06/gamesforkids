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

/** A word still being spoken: recognisers send "aslee" before "asleep". Long enough to be clear, then it counts. */
const started = (heard: string, expected: string) =>
	heard.length >= 3 && heard.length >= expected.length / 2 && expected.startsWith(heard);

/**
 * How far the child has read, given the words heard since `from` words were read (or helped). Each heard word
 * matches the next expected word, or the one after it (the word in between was dropped by the recogniser,
 * usually a short one like "a" or "de"), or is the start of the next word still being said; anything else is
 * ignored. `used` is how many heard words that took, so the next sentence picks up right after them: a child
 * who reads straight on into the next sentence is not asked to read it again.
 */
export function align(sentence: Word[], heard: string[], from: number, lang: Language): { at: number; used: number } {
	let at = from;
	let used = 0;
	for (let i = 0; i < heard.length && at < sentence.length; i++) {
		const h = heard[i];
		if (sameWord(h, sentence[at].key, lang) || (i === heard.length - 1 && started(h, sentence[at].key))) at++;
		else if (at + 1 < sentence.length && sameWord(h, sentence[at + 1].key, lang)) at += 2;
		else continue;
		used = i + 1;
	}
	return { at, used };
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
