export type Language = 'en' | 'nl';
export type Hand = 'left' | 'right';

export const LANGUAGES: { id: Language; flag: string; name: string; speechLang: string }[] = [
	{ id: 'nl', flag: '🇳🇱', name: 'Nederlands', speechLang: 'nl-NL' },
	{ id: 'en', flag: '🇬🇧', name: 'English', speechLang: 'en-US' }
];

// Plain A–Z only: input matching relies on it. Dutch "IJ" is typed as I + J.
export const WORDS: Record<Language, string[]> = {
	en: [
		// home row (tier 1)
		'DAD', 'SAD', 'ADD', 'ASK', 'HAS', 'ALL', 'GAS', 'FLAG', 'HALL', 'FALL', 'GLAD', 'SALAD', 'FLASK', 'ASH', 'LAG',
		'CAT', 'DOG', 'SUN', 'RUN', 'BIG', 'RED', 'BLUE', 'YES', 'NO', 'TOP',
		'HAT', 'MAT', 'SIT', 'POT', 'PAN', 'BALL', 'TREE', 'STAR', 'MOON', 'CAKE',
		'PLAY', 'JUMP', 'SING', 'READ', 'HELP', 'APPLE', 'BOX', 'CUP', 'DUCK', 'EGG',
		'FISH', 'GOAT', 'HEN', 'INK', 'JAR', 'KITE', 'LION', 'MAN', 'NET', 'OWL',
		'PIG', 'QUIZ', 'RAT', 'SOCK', 'TEN', 'UP', 'VAN', 'WAX', 'YAK', 'ZIP',
		'ANT', 'BAT', 'COW', 'DEER', 'EEL', 'FROG', 'GUM', 'HUG', 'IVY', 'KISS',
		'LEAF', 'MICE', 'NUT', 'OAK', 'PEAR', 'QUACK', 'RUG', 'SAND', 'TIGER', 'YARN',
		'ELEPHANT', 'ZEBRA', 'GIRAFFE', 'KANGAROO', 'PENGUIN', 'DOLPHIN', 'LIZARD', 'MONKEY', 'RABBIT', 'SNAKE',
		'TURTLE', 'WHALE', 'BEAR', 'CROCODILE', 'FLAMINGO', 'JAGUAR', 'KITTEN', 'BIRD', 'CATERPILLAR', 'EAGLE'
	],
	nl: [
		// home row (tier 1)
		'JAS', 'DAK', 'DAG', 'HAL', 'GAS', 'LAS', 'ALS', 'KAAS', 'HAK', 'DAS', 'GLAS', 'HALS', 'SLAK', 'DAL', 'LAKS',
		'KAT', 'HOND', 'ZON', 'BAL', 'BOOM', 'HUIS', 'VIS', 'EEND', 'KOE', 'PAARD',
		'MUIS', 'BEER', 'AAP', 'UIL', 'GEIT', 'KIP', 'SCHAAP', 'VARKEN', 'LEEUW', 'TIJGER',
		'OLIFANT', 'GIRAF', 'ZEBRA', 'SLANG', 'KONIJN', 'VLINDER', 'SPIN', 'MAAN', 'STER', 'ROOD',
		'BLAUW', 'GEEL', 'GROEN', 'JA', 'NEE', 'OP', 'IN', 'BED', 'DEUR', 'RAAM',
		'STOEL', 'TAFEL', 'BOEK', 'PEN', 'KOP', 'MELK', 'BROOD', 'APPEL', 'PEER',
		'BANAAN', 'TAART', 'IJS', 'SNOEP', 'FIETS', 'AUTO', 'BOOT', 'TREIN', 'BUS', 'MAMA',
		'PAPA', 'OMA', 'OPA', 'LIEF', 'BLIJ', 'SPELEN', 'SPRINGEN', 'LEZEN', 'ZINGEN', 'DANSEN',
		'REGEN', 'SNEEUW', 'WIND', 'BLOEM', 'GRAS', 'BOS', 'ZEE', 'STRAND', 'DOOS', 'SOK',
		'SCHOEN', 'MUTS', 'HAND', 'VOET', 'NEUS', 'OOR', 'OOG', 'MOND', 'SCHILDPAD'
	]
};

export const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const LEFT_KEYS = 'QWERTASDFGZXCVB';
const HOME_ROW = /^[ASDFGHJKL]+$/;

export const hand = (letter: string): Hand => (LEFT_KEYS.includes(letter) ? 'left' : 'right');

export const MAX_TIER = 5;
/** 1 home row · 2 short · 3 four letters · 4 five–six · 5 seven+ */
export function tierOf(word: string): number {
	if (HOME_ROW.test(word) && word.length <= 5) return 1;
	if (word.length <= 3) return 2;
	if (word.length === 4) return 3;
	if (word.length <= 6) return 4;
	return 5;
}

const bags = new Map<string, string[]>();
let last = '';
/** Shuffle bag per language+tier: no repeat until the tier is used up, never the same word twice in a row. */
export function pickWord(language: Language, tier: number): string {
	const key = `${language}${tier}`;
	let bag = bags.get(key);
	if (!bag?.length) {
		bag = WORDS[language].filter((w) => tierOf(w) === tier).sort(() => Math.random() - 0.5);
		if (bag.length > 1 && bag.at(-1) === last) bag.unshift(bag.pop()!);
		bags.set(key, bag);
	}
	last = bag.pop()!;
	return last;
}

export const PRAISE: Record<Language, string[]> = {
	en: ['Great job!', 'Yes!', 'Well done!', 'Super!'],
	nl: ['Goed zo!', 'Ja!', 'Knap!', 'Super!', 'Top!']
};

export const STICKERS: Record<string, Record<Language, string>> = {
	'🐱': { en: 'cat', nl: 'kat' }, '🐶': { en: 'dog', nl: 'hond' }, '🐟': { en: 'fish', nl: 'vis' },
	'🦆': { en: 'duck', nl: 'eend' }, '🐮': { en: 'cow', nl: 'koe' }, '🐴': { en: 'horse', nl: 'paard' },
	'🐭': { en: 'mouse', nl: 'muis' }, '🐻': { en: 'bear', nl: 'beer' }, '🐵': { en: 'monkey', nl: 'aap' },
	'🦉': { en: 'owl', nl: 'uil' }, '🐐': { en: 'goat', nl: 'geit' }, '🐔': { en: 'hen', nl: 'kip' },
	'🐑': { en: 'sheep', nl: 'schaap' }, '🐷': { en: 'pig', nl: 'varken' }, '🦁': { en: 'lion', nl: 'leeuw' },
	'🐯': { en: 'tiger', nl: 'tijger' }, '🐘': { en: 'elephant', nl: 'olifant' }, '🦒': { en: 'giraffe', nl: 'giraf' },
	'🦓': { en: 'zebra', nl: 'zebra' }, '🐍': { en: 'snake', nl: 'slang' }, '🐰': { en: 'rabbit', nl: 'konijn' },
	'🦋': { en: 'butterfly', nl: 'vlinder' }, '🕷️': { en: 'spider', nl: 'spin' }, '🌙': { en: 'moon', nl: 'maan' },
	'⭐': { en: 'star', nl: 'ster' }, '🐢': { en: 'turtle', nl: 'schildpad' }, '🐬': { en: 'dolphin', nl: 'dolfijn' },
	'🐧': { en: 'penguin', nl: 'pinguïn' }, '🐸': { en: 'frog', nl: 'kikker' }, '🐌': { en: 'snail', nl: 'slak' }
};
