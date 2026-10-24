/**
 * Paint Pot: the colouring pictures and the crayons. Pictures are hand-drawn SVG paths on a 100×100 grid,
 * made of big closed areas so the paint bucket has clear edges. Plain Node-safe module: the voice catalog
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

const r1 = (n: number) => Math.round(n * 10) / 10;
/** Five round petals touching the centre circle. */
const petals = (cx: number, cy: number, dist: number, r: number) =>
	[-90, -18, 54, 126, 198]
		.map((deg) => circle(r1(cx + dist * Math.cos((deg * Math.PI) / 180)), r1(cy + dist * Math.sin((deg * Math.PI) / 180)), r))
		.join(' ');

export const PICTURES: Picture[] = [
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
