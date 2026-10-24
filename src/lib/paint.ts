/**
 * Paint Pot: the colouring pictures, in chapters, and the crayons. Pictures are hand-drawn SVG paths on a
 * 100×100 grid, made of big closed areas so the paint bucket has clear edges. Story characters come from
 * fairy tales and Aesop's fables (public domain), drawn in our own style. Plain Node-safe module: the voice catalog
 * imports the names from here.
 */
import type { Language } from './words';

export interface Crayon {
	id: string;
	/** #rrggbb: the flood fill takes hex colours. */
	hex: string;
	name: Record<Language, string>;
}

export const CRAYONS: Crayon[] = [
	{ id: 'red', hex: '#e2352b', name: { en: 'red', nl: 'rood' } },
	{ id: 'orange', hex: '#f28c28', name: { en: 'orange', nl: 'oranje' } },
	{ id: 'yellow', hex: '#f6c21a', name: { en: 'yellow', nl: 'geel' } },
	{ id: 'green', hex: '#2f8f4e', name: { en: 'green', nl: 'groen' } },
	{ id: 'blue', hex: '#1d5fb0', name: { en: 'blue', nl: 'blauw' } },
	{ id: 'purple', hex: '#8e44ad', name: { en: 'purple', nl: 'paars' } },
	{ id: 'pink', hex: '#f48fb1', name: { en: 'pink', nl: 'roze' } },
	{ id: 'brown', hex: '#8b5a2b', name: { en: 'brown', nl: 'bruin' } },
	{ id: 'black', hex: '#000000', name: { en: 'black', nl: 'zwart' } }
];

export interface Picture {
	id: string;
	/** Outline path in a 100×100 box. */
	d: string;
	/** Said when the picture is finished: praise for the work, not the child. */
	done: Record<Language, string>;
}

/** A closed circle as two arcs. */
const circle = (cx: number, cy: number, r: number) =>
	`M${cx + r} ${cy} A${r} ${r} 0 1 1 ${cx - r} ${cy} A${r} ${r} 0 1 1 ${cx + r} ${cy} Z`;

/** A closed ellipse as two arcs. */
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
	`M${cx + rx} ${cy} A${rx} ${ry} 0 1 1 ${cx - rx} ${cy} A${rx} ${ry} 0 1 1 ${cx + rx} ${cy} Z`;

const r1 = (n: number) => Math.round(n * 10) / 10;
/** A five-pointed star, point up. */
const star = (cx: number, cy: number, r: number) =>
	Array.from({ length: 10 }, (_, i) => {
		const a = ((i * 36 - 90) * Math.PI) / 180;
		const k = i % 2 ? r * 0.45 : r;
		return `${i ? 'L' : 'M'}${r1(cx + k * Math.cos(a))} ${r1(cy + k * Math.sin(a))}`;
	}).join(' ') + ' Z';
/** Five round petals touching the centre circle. */
const petals = (cx: number, cy: number, dist: number, r: number) =>
	[-90, -18, 54, 126, 198]
		.map((deg) => circle(r1(cx + dist * Math.cos((deg * Math.PI) / 180)), r1(cy + dist * Math.sin((deg * Math.PI) / 180)), r))
		.join(' ');

const WORLD: Picture[] = [
	{
		id: 'sun',
		d: [
			circle(50, 50, 20),
			'M50 22 L50 8 M50 78 L50 92 M22 50 L8 50 M78 50 L92 50',
			'M30 30 L20 20 M70 30 L80 20 M30 70 L20 80 M70 70 L80 80',
			'M43 43 L43 47 M57 43 L57 47 M41 56 Q50 64 59 56'
		].join(' '),
		done: { en: 'You painted a lovely sun!', nl: 'Je hebt een mooie zon geschilderd!' }
	},
	{
		id: 'house',
		d: [
			'M20 49 L20 88 L80 88 L80 49',
			'M12 49 L50 15 L88 49 Z',
			'M43 88 L43 64 L57 64 L57 88',
			'M26 56 H38 V67 H26 Z M62 56 H74 V67 H62 Z',
			'M5 88 H95'
		].join(' '),
		done: { en: 'You painted a lovely house!', nl: 'Je hebt een mooi huis geschilderd!' }
	},
	{
		id: 'fish',
		d: [
			'M18 50 Q44 20 72 50 Q44 80 18 50 Z',
			'M72 50 L90 34 L90 66 Z',
			'M50 30 Q45 50 50 70',
			circle(31, 46, 3.5),
			circle(78, 18, 4),
			circle(87, 8, 3)
		].join(' '),
		done: { en: 'You painted a lovely fish!', nl: 'Je hebt een mooie vis geschilderd!' }
	},
	{
		id: 'cat',
		d: [
			circle(50, 55, 28),
			'M26.5 39.7 L28 14 L45 27.5 M73.5 39.7 L72 14 L55 27.5',
			circle(40, 50, 4.5),
			circle(60, 50, 4.5),
			'M46 60 L54 60 L50 65 Z',
			'M50 65 Q46 71 41 68 M50 65 Q54 71 59 68',
			'M36 62 L14 58 M36 66 L15 69 M64 62 L86 58 M64 66 L85 69'
		].join(' '),
		done: { en: 'You painted a lovely cat!', nl: 'Je hebt een mooie kat geschilderd!' }
	},
	{
		id: 'flower',
		d: [
			circle(50, 35, 10),
			petals(50, 35, 20, 10),
			'M50 55 L50 95',
			'M50 80 Q64 66 76 72 Q64 86 50 80 Z',
			'M50 72 Q36 58 24 64 Q36 78 50 72 Z'
		].join(' '),
		done: { en: 'You painted a lovely flower!', nl: 'Je hebt een mooie bloem geschilderd!' }
	},
	{
		id: 'car',
		d: [
			'M8 70 L8 52 L28 49 L38 33 L68 33 L80 49 L92 53 L92 70 Z',
			'M41 37 H52 V49 H33 Z M56 37 H66 L75 49 H56 Z',
			circle(29, 71, 9),
			circle(71, 71, 9),
			'M2 80 H98'
		].join(' '),
		done: { en: 'You painted a lovely car!', nl: 'Je hebt een mooie auto geschilderd!' }
	},
	{
		id: 'tree',
		d: [
			'M44 92 L44 64 M56 64 L56 92',
			'M30 64 Q14 62 18 46 Q12 30 30 26 Q36 10 52 14 Q68 8 74 24 Q90 28 84 44 Q90 60 72 64 Z',
			circle(36, 40, 4.5),
			circle(58, 30, 4.5),
			circle(68, 50, 4.5),
			circle(46, 52, 4.5),
			'M5 92 H95'
		].join(' '),
		done: { en: 'You painted a lovely tree!', nl: 'Je hebt een mooie boom geschilderd!' }
	},
	{
		id: 'butterfly',
		d: [
			'M46 30 Q50 25 54 30 L54 76 Q50 80 46 76 Z',
			'M46 38 Q20 6 10 30 Q8 52 46 52 M46 54 Q18 56 20 76 Q32 90 46 66',
			'M54 38 Q80 6 90 30 Q92 52 54 52 M54 54 Q82 56 80 76 Q68 90 54 66',
			circle(28, 34, 6),
			circle(72, 34, 6),
			circle(31, 69, 4.5),
			circle(69, 69, 4.5),
			'M48 28 Q44 16 37 13 M52 28 Q56 16 63 13'
		].join(' '),
		done: { en: 'You painted a lovely butterfly!', nl: 'Je hebt een mooie vlinder geschilderd!' }
	}
];

const PIGS: Picture[] = [
	{
		id: 'pig',
		d: [
			circle(50, 52, 30),
			'M27 32.7 L24 12 L39.7 23.8 M73 32.7 L76 12 L60.3 23.8',
			circle(38, 44, 3.5),
			circle(62, 44, 3.5),
			ellipse(50, 63, 13, 9),
			ellipse(45, 63, 2.5, 4),
			ellipse(55, 63, 2.5, 4),
			'M43 75 Q50 79 57 75'
		].join(' '),
		done: { en: 'You painted a lovely little pig!', nl: 'Je hebt een mooi biggetje geschilderd!' }
	},
	{
		id: 'strawhouse',
		d: [
			'M22 52 L22 88 L78 88 L78 52',
			'M14 54 Q20 20 50 14 Q80 20 86 54 Z',
			'M30 42 L34 30 M47 46 L49 28 M64 42 L61 29',
			circle(36, 68, 6),
			'M54 88 L54 72 Q62 60 70 72 L70 88',
			'M5 88 H95'
		].join(' '),
		done: { en: 'You painted a lovely straw house!', nl: 'Je hebt een mooi strohuisje geschilderd!' }
	},
	{
		id: 'wolf',
		d: [
			'M50 90 Q30 86 22 66 L14 40 L16 14 L34 30 Q50 24 66 30 L84 14 L86 40 L78 66 Q70 86 50 90 Z',
			'M20 24 L21 36 L29 31 Z M80 24 L79 36 L71 31 Z',
			ellipse(38, 48, 4, 5),
			ellipse(62, 48, 4, 5),
			'M36 62 Q50 55 64 62 Q61 82 50 84 Q39 82 36 62 Z',
			ellipse(50, 64, 6, 4),
			'M50 68 L50 74 M43 76 Q50 80 57 76'
		].join(' '),
		done: { en: 'You painted a lovely wolf!', nl: 'Je hebt een mooie wolf geschilderd!' }
	},
	{
		id: 'brickhouse',
		d: [
			'M18 50 L18 88 L82 88 L82 50',
			'M12 52 L50 18 L88 52 Z',
			'M66 32.3 L66 20 L76 20 L76 41.3',
			'M43 88 L43 70 Q50 60 57 70 L57 88',
			'M18 62 H82 M30 50 V62 M50 50 V62 M70 50 V62',
			'M18 75 H43 M57 75 H82 M30 62 V75 M70 62 V75 M36 75 V88 M64 75 V88',
			'M5 88 H95'
		].join(' '),
		done: { en: 'You painted a lovely brick house!', nl: 'Je hebt een mooi stenen huis geschilderd!' }
	}
];

const RED: Picture[] = [
	{
		id: 'redhood',
		d: [
			'M50 14 Q75 14 75 42 Q75 57 67 62 L33 62 Q25 57 25 42 Q25 14 50 14 Z',
			circle(50, 42, 14),
			'M37 37 Q44 28 50 30 Q56 28 63 37',
			circle(45, 42, 2),
			circle(55, 42, 2),
			'M45 49 Q50 53 55 49',
			'M33 62 L20 92 L80 92 L67 62',
			circle(50, 73, 2.5),
			circle(50, 83, 2.5)
		].join(' '),
		done: { en: 'You painted Little Red Riding Hood!', nl: 'Je hebt Roodkapje geschilderd!' }
	},
	{
		id: 'basket',
		d: [
			'M18 50 L82 50 L74 86 L26 86 Z',
			'M26 50 Q50 4 74 50',
			'M21.1 64 H78.9 M23.6 75 H76.4',
			circle(41, 44, 8),
			circle(59, 44, 8)
		].join(' '),
		done: { en: 'You painted a lovely basket!', nl: 'Je hebt een mooie mand geschilderd!' }
	},
	{
		id: 'grandma',
		d: [
			circle(50, 50, 24),
			circle(50, 20, 9),
			'M26.5 45 Q30 28 50 26 Q70 28 73.5 45',
			circle(40, 52, 7),
			circle(60, 52, 7),
			'M47 52 L53 52',
			circle(40, 52, 2),
			circle(60, 52, 2),
			'M42 64 Q50 70 58 64',
			'M24 94 Q26 74 50 74 Q74 74 76 94 Z'
		].join(' '),
		done: { en: 'You painted a lovely grandma!', nl: 'Je hebt een mooie oma geschilderd!' }
	},
	{
		id: 'mushroom',
		d: [
			'M14 54 Q14 18 50 18 Q86 18 86 54 Z',
			'M38 54 L36 88 L64 88 L62 54',
			circle(34, 38, 5),
			circle(54, 30, 6),
			circle(70, 42, 5),
			'M5 88 H95 M20 88 L18 80 M24 88 L26 79 M78 88 L76 80 M82 88 L84 79'
		].join(' '),
		done: { en: 'You painted a lovely mushroom!', nl: 'Je hebt een mooie paddenstoel geschilderd!' }
	}
];

const RACE: Picture[] = [
	{
		id: 'tortoise',
		d: [
			'M14 66 Q18 26 50 26 Q80 26 84 66 Z',
			'M34 66 L40 42 L60 42 L66 66',
			'M84 62 Q84 44 92 44 Q99 46 98 55 Q96 64 84 66',
			circle(92, 51, 1.8),
			'M24 66 Q22 80 30 80 Q38 80 36 66 M62 66 Q60 80 68 80 Q76 80 74 66',
			'M2 80 H98'
		].join(' '),
		done: { en: 'You painted a lovely tortoise!', nl: 'Je hebt een mooie schildpad geschilderd!' }
	},
	{
		id: 'hare',
		d: [
			circle(50, 40, 16),
			'M43 25.6 Q30 0 41 3 Q48 8 49 24 M57 25.6 Q70 0 59 3 Q52 8 51 24',
			'M43 20 Q38 9 41 7 M57 20 Q62 9 59 7',
			circle(44, 37, 2.5),
			circle(56, 37, 2.5),
			'M48 45 L52 45 L50 47.5 Z',
			'M50 47.5 Q47 51 45 49 M50 47.5 Q53 51 55 49',
			'M38.7 51.3 Q24 70 30 88 L70 88 Q76 70 61.3 51.3',
			ellipse(50, 72, 10, 12),
			ellipse(37, 89, 9, 4),
			ellipse(63, 89, 9, 4)
		].join(' '),
		done: { en: 'You painted a lovely hare!', nl: 'Je hebt een mooie haas geschilderd!' }
	},
	{
		id: 'trophy',
		d: [
			'M30 20 L70 20 Q70 52 50 56 Q30 52 30 20 Z',
			'M30 26 Q16 26 18 37 Q20 45 34.5 44 M70 26 Q84 26 82 37 Q80 45 65.5 44',
			star(50, 35, 9),
			'M46 55.6 L46 70 L54 70 L54 55.6',
			'M32 70 H68 V82 H32 Z'
		].join(' '),
		done: { en: 'You painted a lovely trophy!', nl: 'Je hebt een mooie beker geschilderd!' }
	},
	{
		id: 'carrot',
		d: [
			'M50 94 L34 40 Q50 32 66 40 Z',
			'M44 36.5 Q28 18 40 12 Q48 20 49 34.5 M51 34.5 Q52 10 60 8 Q66 20 56 36.3',
			'M41 54 L48 54 M52 66 L59 66 M44 78 L50 78'
		].join(' '),
		done: { en: 'You painted a lovely carrot!', nl: 'Je hebt een mooie wortel geschilderd!' }
	}
];

export interface Chapter {
	id: string;
	name: Record<Language, string>;
	pictures: Picture[];
}

export const CHAPTERS: Chapter[] = [
	{ id: 'world', name: { en: 'My world', nl: 'Mijn wereld' }, pictures: WORLD },
	{ id: 'pigs', name: { en: 'The Three Little Pigs', nl: 'De drie biggetjes' }, pictures: PIGS },
	{ id: 'red', name: { en: 'Little Red Riding Hood', nl: 'Roodkapje' }, pictures: RED },
	{ id: 'race', name: { en: 'The Tortoise and the Hare', nl: 'De haas en de schildpad' }, pictures: RACE }
];

export const PICTURES: Picture[] = CHAPTERS.flatMap((c) => c.pictures);
