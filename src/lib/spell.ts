import { editSimilarity } from './score';
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

/** Digraphs that sound identical: normalize before measuring distance. */
const SOUND_NORM: Record<Language, [RegExp, string][]> = {
	en: [[/CK/g, 'K'], [/PH/g, 'F']],
	nl: [[/IJ/g, 'EI'], [/OU/g, 'AU'], [/CH/g, 'G']]
};
const VOWELS = 'AEIOUY';

/**
 * Phonetic closeness 0–1: weighted edit distance where edits that barely
 * change the sound are cheap. KAT→CAT ≈ 0.83 (sound-alike first letter),
 * MAN→CAT ≈ 0.33. Getting the first sound wrong costs double: the word
 * onset is what children latch onto first.
 */
export function similarity(guess: string, word: string, language: Language): number {
	let a = guess, b = word;
	for (const [re, to] of SOUND_NORM[language]) {
		a = a.replace(re, to);
		b = b.replace(re, to);
	}
	const cheap = new Set(
		CONFUSIONS[language]
			.filter(([x, y]) => x.length === 1 && y.length === 1)
			.flatMap(([x, y]) => [x + y, y + x])
	);
	return editSimilarity(a, b, {
		sub: (x, y, i, j) => {
			if (x === y) return 0;
			const base = cheap.has(x + y) ? 0.25 : VOWELS.includes(x) && VOWELS.includes(y) ? 0.5 : 1;
			return i === 0 && j === 0 ? base * 2 : base;
		},
		// Deleting/inserting one half of a double letter keeps the sound: cheap.
		indel: (s, i) => (s[i] === s[i - 1] || s[i] === s[i + 1] ? 0.35 : 1),
		// Adjacent swap: right letters, wrong order — but it sounds different.
		swap: 0.8
	});
}

/** Everyday words young children know: animals, food, home, body, weather. 4+ letters so there is something to spell. */
export const SPELL_WORDS: Record<Language, string[]> = {
	en: [
		'APPLE', 'BALL', 'BEAR', 'BIRD', 'BOAT', 'BOOK', 'CAKE', 'DUCK', 'FISH', 'FROG',
		'TREE', 'STAR', 'MOON', 'MILK', 'LION', 'TIGER', 'HORSE', 'MOUSE', 'HOUSE', 'TRAIN',
		'RAIN', 'SNOW', 'FLOWER', 'MONKEY', 'RABBIT', 'BANANA', 'YELLOW', 'GREEN', 'WATER', 'HAPPY',
		'DADDY', 'MOMMY', 'BABY', 'SHOE', 'HAND', 'NOSE', 'BEACH', 'SCHOOL', 'CANDY', 'PIZZA'
	],
	nl: [
		'APPEL', 'BOOM', 'HUIS', 'EEND', 'PAARD', 'MUIS', 'BEER', 'GEIT', 'SCHAAP', 'KONIJN',
		'POES', 'HOND', 'KIKKER', 'VLINDER', 'MAAN', 'STER', 'ROOD', 'GEEL', 'GROEN', 'BLAUW',
		'BOEK', 'MELK', 'BROOD', 'PEER', 'BANAAN', 'TAART', 'FIETS', 'BOOT', 'TREIN', 'BLOEM',
		'REGEN', 'SNEEUW', 'STRAND', 'SCHOEN', 'HAND', 'NEUS', 'MOND', 'WATER', 'SCHOOL', 'MAMA'
	]
};

const bags = new Map<Language, string[]>();
let last = '';
/** Shuffle bag per language: no repeats until the list is used up, never the same word twice in a row. */
export function pickSpellWord(language: Language): string {
	let bag = bags.get(language);
	if (!bag?.length) {
		bag = [...SPELL_WORDS[language]].sort(() => Math.random() - 0.5);
		if (bag.length > 1 && bag.at(-1) === last) bag.unshift(bag.pop()!);
		bags.set(language, bag);
	}
	last = bag.pop()!;
	return last;
}
