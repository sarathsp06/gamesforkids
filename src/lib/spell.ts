import type { Language } from './words';

const random = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Plausible misspellings: sound-alike or look-alike substitutions per language. */
const CONFUSIONS: Record<Language, [string, string][]> = {
	en: [
		['A', 'E'], ['E', 'I'], ['O', 'U'], ['C', 'K'], ['S', 'Z'], ['B', 'D'], ['F', 'V'],
		['G', 'J'], ['M', 'N'], ['P', 'B'], ['T', 'D'], ['W', 'V'], ['Y', 'I']
	],
	nl: [
		['A', 'E'], ['E', 'I'], ['O', 'U'], ['B', 'D'], ['F', 'V'], ['S', 'Z'], ['M', 'N'],
		['G', 'CH'], ['EI', 'IJ'], ['AU', 'OU'], ['T', 'D'], ['P', 'B'], ['K', 'C']
	]
};

function mutate(word: string, language: Language): string {
	const kind = Math.floor(Math.random() * 4);
	const i = Math.floor(Math.random() * word.length);
	if (kind === 0) {
		// Substitute via a confusion pair, either direction.
		const pairs = CONFUSIONS[language].flatMap(([a, b]) => [[a, b], [b, a]]);
		const hits = pairs.filter(([a]) => word.includes(a));
		if (hits.length) {
			const [a, b] = random(hits);
			const at = word.indexOf(a);
			return word.slice(0, at) + b + word.slice(at + a.length);
		}
	}
	if (kind === 1 && word.length >= 3) {
		// Swap two adjacent letters.
		const j = Math.min(i, word.length - 2);
		if (word[j] !== word[j + 1]) return word.slice(0, j) + word[j + 1] + word[j] + word.slice(j + 2);
	}
	if (kind === 2) {
		// Double a letter, or collapse an existing double.
		const dbl = word.match(/(.)\1/);
		if (dbl) return word.replace(dbl[0], dbl[1]);
		return word.slice(0, i + 1) + word[i] + word.slice(i + 1);
	}
	// Drop a letter (words of 4+ only).
	if (word.length >= 4) return word.slice(0, i) + word.slice(i + 1);
	return word;
}

/** The right spelling plus `count − 1` wrong ones, shuffled. */
export function choices(word: string, language: Language, count = 3): string[] {
	const wrong = new Set<string>();
	for (let tries = 0; wrong.size < count - 1 && tries < 100; tries++) {
		const m = mutate(word, language);
		if (m !== word) wrong.add(m);
	}
	return [word, ...wrong].sort(() => Math.random() - 0.5);
}
