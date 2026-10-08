import { NEAR, editSimilarity } from './score';
import type { Language } from './words';

/** Sound-alike or look-alike letters per language: cheap substitutions in `similarity`. */
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

/** Spell Pick levels: 1 clearly different words, 2 close real words, 3 a sound-alike spelling + a far word, 4 a sound-alike spelling + a close word. */
export const SPELL_LEVELS = 4;

const shuffle = <T>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

/** Spellings that make the same sound: the only swaps used to build "sounds right" options. */
const SAME_SOUND: Record<Language, [string, string][]> = {
	en: [['CK', 'K'], ['C', 'K'], ['S', 'Z'], ['PH', 'F'], ['AI', 'AY']],
	nl: [['EI', 'IJ'], ['AU', 'OU'], ['CH', 'G'], ['C', 'K'], ['S', 'Z']]
};
const CONSONANT = /[^AEIOUY]/;
/** Letter combos where a swap changed the sound or looks unreal: soft C (CIKKER), Z before a consonant (ZNOW), KK/CC/KC/KH, SZ. */
const SOUND_CHANGED = /(?=(C[EIYCKH]|K[CHK]|Z[^AEIOUY]|SZ))/g;
const changes = (w: string) => [...w.matchAll(SOUND_CHANGED)].map((m) => m[1]);

/** Misspellings that sound like `word`: CAT→KAT, HUIS→HUIZ, APPLE→APLE, HOND→HONT. */
export function soundAlikes(word: string, language: Language): string[] {
	const out = new Set<string>();
	for (const [x, y] of SAME_SOUND[language]) {
		for (const [from, to] of [[x, y], [y, x]]) {
			for (let i = word.indexOf(from); i >= 0; i = word.indexOf(from, i + 1)) {
				out.add(word.slice(0, i) + to + word.slice(i + from.length));
			}
		}
	}
	// A doubled consonant halved keeps the sound (APPLE→APLE); doubled vowels don't (BOOK≠BOK).
	for (let i = 1; i < word.length; i++) {
		if (word[i] === word[i - 1] && CONSONANT.test(word[i])) out.add(word.slice(0, i) + word.slice(i + 1));
	}
	// Dutch final D sounds like T: HOND→HONT.
	if (language === 'nl' && word.endsWith('D')) out.add(word.slice(0, -1) + 'T');
	const real = new Set(SPELL_WORDS[language]);
	const own = new Set(changes(word));
	return [...out].filter(
		(w) =>
			w !== word &&
			!real.has(w) &&
			changes(w).every((c) => own.has(c)) &&
			similarity(w, word, language) >= NEAR
	);
}

/** The spoken word plus two other options for the given level, shuffled. */
export function choices(word: string, language: Language, level = 1): string[] {
	const byCloseness = shuffle(SPELL_WORDS[language].filter((w) => w !== word))
		.map((w) => ({ w, sim: similarity(w, word, language) }))
		.sort((a, b) => b.sim - a.sim);
	const close = byCloseness.slice(0, 2).map((o) => o.w);
	const far = shuffle(byCloseness.filter((o) => o.sim < 0.5).map((o) => o.w));
	const alike = shuffle(soundAlikes(word, language))[0];
	const others =
		level <= 1 ? far.slice(0, 2)
		: level === 2 || !alike ? close
		: level === 3 ? [alike, far[0]]
		: [alike, close[0]];
	return shuffle([word, ...others]);
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

/** Everyday words young children know: animals, food, home, body, weather. */
export const SPELL_WORDS: Record<Language, string[]> = {
	en: [
		'CAT', 'DOG', 'CAR', 'SUN', 'BUS', 'PIG', 'HAT', 'BED', 'CUP', 'EGG',
		'APPLE', 'BALL', 'BEAR', 'BIRD', 'BOAT', 'BOOK', 'CAKE', 'DUCK', 'FISH', 'FROG',
		'TREE', 'STAR', 'MOON', 'MILK', 'LION', 'TIGER', 'HORSE', 'MOUSE', 'HOUSE', 'TRAIN',
		'RAIN', 'SNOW', 'FLOWER', 'MONKEY', 'RABBIT', 'BANANA', 'YELLOW', 'GREEN', 'WATER', 'HAPPY',
		'DADDY', 'MOMMY', 'BABY', 'SHOE', 'HAND', 'NOSE', 'BEACH', 'SCHOOL', 'CANDY', 'PIZZA'
	],
	nl: [
		'KAT', 'BUS', 'ZON', 'BED', 'VIS', 'AAP', 'KOE', 'PET', 'KOP', 'AUTO',
		'APPEL', 'BOOM', 'HUIS', 'EEND', 'PAARD', 'MUIS', 'BEER', 'GEIT', 'SCHAAP', 'KONIJN',
		'POES', 'HOND', 'KIKKER', 'VLINDER', 'MAAN', 'STER', 'ROOD', 'GEEL', 'GROEN', 'BLAUW',
		'BOEK', 'MELK', 'BROOD', 'PEER', 'BANAAN', 'TAART', 'FIETS', 'BOOT', 'TREIN', 'BLOEM',
		'REGEN', 'SNEEUW', 'STRAND', 'SCHOEN', 'HAND', 'NEUS', 'MOND', 'WATER', 'SCHOOL', 'MAMA'
	]
};

const bags = new Map<string, string[]>();
let last = '';
/**
 * Shuffle bag per language and level: no repeats until the list is used up, never the same word
 * twice in a row. Levels 3+ only use words that have a sound-alike spelling to show.
 */
export function pickSpellWord(language: Language, level = 1): string {
	const key = `${language}-${level >= 3}`;
	let bag = bags.get(key);
	if (!bag?.length) {
		const words = level >= 3 ? SPELL_WORDS[language].filter((w) => soundAlikes(w, language).length) : SPELL_WORDS[language];
		bag = shuffle(words);
		if (bag.length > 1 && bag.at(-1) === last) bag.unshift(bag.pop()!);
		bags.set(key, bag);
	}
	last = bag.pop()!;
	return last;
}
