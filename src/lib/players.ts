/**
 * Players: a picture, a name and an age, kept on this device only. Age picks the mode: Little (3–5) hides
 * every word but the one being learnt and keeps choices few; Big (6–9) shows short labels and all games.
 * Plain Node-safe module.
 */
export type Mode = 'little' | 'big';

export interface Player {
	id: string;
	name: string;
	avatar: number;
	age: number;
	/** A grown-up can pin the mode; otherwise it follows age. */
	mode?: Mode;
}

export const MIN_AGE = 3;
export const MAX_AGE = 9;
export const LITTLE_MAX_AGE = 5;

export const modeFor = (p: Pick<Player, 'age' | 'mode'>): Mode => p.mode ?? (p.age <= LITTLE_MAX_AGE ? 'little' : 'big');

export interface Look {
	skin: string;
	hair: 'bob' | 'short' | 'curly' | 'bun';
	hairColor: string;
	glasses?: boolean;
	flower?: boolean;
}

export const AVATARS: Look[] = [
	{ skin: '#F4C7A1', hair: 'bob', hairColor: '#E2352B', flower: true },
	{ skin: '#C98E5C', hair: 'short', hairColor: '#1C1B18', glasses: true },
	{ skin: '#8D5524', hair: 'curly', hairColor: '#1C1B18' },
	{ skin: '#F1D3B3', hair: 'bun', hairColor: '#F6C21A' },
	{ skin: '#E0AC69', hair: 'short', hairColor: '#8B5A2B' },
	{ skin: '#FFDBAC', hair: 'curly', hairColor: '#F28C28', glasses: true }
];

/** The games each mode shows on the home screen, in order. Little mode leaves out games that need reading. */
/** `together`: the game can be played with a paired friend (design/presence), shown on its tile. */
/** `tablet`: needs a tablet's room (painting, playing with a friend), so a phone's home leaves it out. */
export const GAMES: { id: string; path: string; little: boolean; tint: string; together?: boolean; tablet?: boolean }[] = [
	{ id: 'spell', path: '/spell', little: true, tint: 'mint' },
	{ id: 'shapes', path: '/shapes', little: true, tint: 'blush' },
	{ id: 'paint', path: '/paint', little: true, tint: 'butter', together: true, tablet: true },
	{ id: 'letters', path: '/letter-leap', little: true, tint: 'paper' },
	{ id: 'math', path: '/math', little: true, tint: 'sky' },
	{ id: 'chess', path: '/chess', little: false, tint: 'butter' },
	{ id: 'read', path: '/read', little: false, tint: 'mint' }
];

export const gamesFor = (mode: Mode) => (mode === 'little' ? GAMES.filter((g) => g.little) : GAMES);

export const newId = () => Math.random().toString(36).slice(2, 10);
