/**
 * Players: a picture and a name, kept on this device only. Every game is open to every player. A grown-up can set
 * the mode, which only changes the look: Little hides every word but the one being learnt; Big (the default) shows
 * short labels. Plain Node-safe module.
 */
export type Mode = 'little' | 'big';

export interface Player {
	id: string;
	name: string;
	avatar: number;
	/** Asked by earlier versions; kept on players made then, but no longer used for anything. */
	age?: number;
	/** Set by a grown-up; Big when not set. */
	mode?: Mode;
}

export const modeFor = (p: Pick<Player, 'mode'>): Mode => p.mode ?? 'big';

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

/** The games on the home screen, in order: every player sees them all. */
/** `together`: the game can be played with a paired friend (design/presence), shown on its tile. */
/** `tablet`: needs a tablet's room (painting, playing with a friend), so a phone's home leaves it out. */
export const GAMES: { id: string; path: string; tint: string; together?: boolean; tablet?: boolean }[] = [
	{ id: 'spell', path: '/spell', tint: 'mint' },
	{ id: 'shapes', path: '/shapes', tint: 'blush' },
	{ id: 'paint', path: '/paint', tint: 'butter', together: true, tablet: true },
	{ id: 'letters', path: '/letter-leap', tint: 'paper' },
	{ id: 'math', path: '/math', tint: 'sky' },
	{ id: 'chess', path: '/chess', tint: 'butter' },
	{ id: 'read', path: '/read', tint: 'mint' }
];

export const newId = () => Math.random().toString(36).slice(2, 10);
