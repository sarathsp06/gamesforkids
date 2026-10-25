/** Each game's progress as "level n of m", for the home tiles' dots and the grown-ups' notes. */
import { CHESS_LEVELS, READ_LEVELS, SHAPE_LEVELS, SPELL_LEVELS } from './limits';
import { LEVELS as MATH_LEVELS, isUnlocked } from './math';
import { MAX_TIER } from './words';
import { CHAPTERS } from './paint';
import {
	loadChessLevel, loadMath, loadPainted, loadProgress, loadRead, loadSettings, loadShapeLevel, loadSpellLevel
} from './storage';

export interface Level {
	at: number;
	of: number;
}

export function levelOf(game: string): Level {
	switch (game) {
		case 'spell':
			return { at: loadSpellLevel(), of: SPELL_LEVELS };
		case 'shapes':
			return { at: loadShapeLevel(), of: SHAPE_LEVELS };
		case 'chess':
			return { at: loadChessLevel(), of: CHESS_LEVELS };
		case 'read':
			return { at: loadRead().level, of: READ_LEVELS };
		case 'letters':
			return { at: loadProgress().tier, of: MAX_TIER };
		case 'math': {
			const best = loadMath().best;
			const clock = loadSettings().clock;
			let at = 1;
			for (let l = 1; l <= MATH_LEVELS.length; l++) if (isUnlocked(best, l, clock)) at = l;
			return { at, of: MATH_LEVELS.length };
		}
		case 'paint': {
			const done = loadPainted();
			// A chapter counts once a picture in it is painted; a fresh player is still on the first chapter.
			return { at: Math.max(1, CHAPTERS.filter((c) => c.pictures.some((p) => done.includes(p.id))).length), of: CHAPTERS.length };
		}
	}
	return { at: 1, of: 1 };
}
