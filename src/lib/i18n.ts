/**
 * Every line the games say out loud, keyed like an i18n catalog. Each key has an English and a
 * Dutch text, and each (language, key) can have a recorded clip in static/voice/<lang>/<key>.mp3
 * (see scripts/voice.md). Games build Lines with t(), word(), letter() and animal(), and
 * speak() plays the clips, falling back to the browser voice for any line without a current clip.
 *
 * Plain Node-safe module; the clip generator's full list of lines is allLines() in voice-catalog.ts.
 */
// Types only from the game data: pages import this module, and must not carry every story and picture with it.
// The full list of lines for the clip generator is in voice-catalog.ts.
import { STICKERS, type Language } from './words';
import type { Story } from './stories';
import type { Chapter, Crayon, Picture } from './paint';

/** One spoken line: `id` names its clip, `text` is what is said. */
export interface Line {
	id: string;
	text: string;
}

/** A numbered family of lines: one key and clip per n in from..to. */
interface Family {
	from: number;
	to: number;
	text: (n: number) => string;
}
type Entry = string | string[] | Family;

// Numbers as words: the voice model can't read digits, and the clips should say exactly what is shown.
const NUMBERS: Record<Language, string[]> = {
	en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
		'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
	nl: ['nul', 'één', 'twee', 'drie', 'vier', 'vijf', 'zes', 'zeven', 'acht', 'negen', 'tien', 'elf', 'twaalf',
		'dertien', 'veertien', 'vijftien', 'zestien', 'zeventien', 'achttien', 'negentien', 'twintig']
};

const en = {
	'lang.name': 'English',
	praise: ['Great job!', 'Yes!', 'Well done!', 'Super!'],
	almost: ['Almost!', 'So close!'],
	/** A count, said after a right answer. A bare number is too short for the voice model. */
	count: { from: 1, to: 12, text: (n: number) => (n === 1 ? 'There is one!' : `There are ${NUMBERS.en[n]}!`) },

	'shapes.find.circle': 'Find the circle.',
	'shapes.find.triangle': 'Find the triangle.',
	'shapes.find.square': 'Find the square.',
	'shapes.find.rectangle': 'Find the rectangle.',
	'shapes.howMany.circle': 'How many circles?',
	'shapes.howMany.triangle': 'How many triangles?',
	'shapes.odd': 'Which one is different?',
	'shapes.next': 'What comes next?',
	'shapes.fact.circle': 'A circle is round.',
	'shapes.fact.triangle': 'A triangle has three sides.',
	'shapes.fact.square': 'A square has four sides, all the same.',
	'shapes.fact.rectangle': 'A rectangle has two long sides and two short sides.',
	'shapes.almost.find': 'Almost! Look closely: straight sides, all joined up.',
	'shapes.almost.next': 'Almost! Look at the colour.',
	'shapes.almost.count': 'Almost! Count again, one by one.',

	'chess.rule.rook': 'The rook goes in straight lines.',
	'chess.rule.bishop': 'The bishop goes on slanted lines.',
	'chess.rule.knight': 'The horse jumps: two steps, then one to the side.',
	'chess.rule.pawn': 'Pawns go one step straight ahead, and take one step slanted.',
	'chess.star': 'Get the star!',
	'chess.stars': 'Get all the stars!',
	'chess.guard': "Watch out for the red guard! Don't stop where it can catch you.",
	'chess.caught': 'Oops! The guard can catch you there.',
	'chess.fewest': 'The fewest moves!',
	'chess.canDoIn': { from: 1, to: 9, text: (n: number) => `You can do it in ${NUMBERS.en[n]} ${n === 1 ? 'move' : 'moves'}!` },
	'chess.hex': 'Get a pawn to the other side!',
	'chess.lost': 'The computer won. Try again!',

	'read.go': 'Read it out loud!',
	'read.end': 'The end!',
	'read.needs': 'Read Along has to hear you read, or it can\'t work.',
	'read.problem.unsupported': "This browser can't listen. Please open the game in Chrome, Edge or Safari.",
	'read.problem.denied': 'The microphone is not allowed. Ask a grown-up to allow the microphone for this site.',
	'read.problem.nomic': "I can't find a microphone. Please connect one and try again.",
	'read.problem.network': 'Listening needs the internet right now. Please check the connection and try again.',
	'read.problem.silent': "I can't hear any words. Check that the microphone is on and not muted, then try again.",

	'paint.go': 'Pick a colour and paint!',
	'paint.others': 'Look what other children painted!',
	'friend.here': 'Your friend is here!',
	'friend.ask': 'Ask your friend to paint with you?',
	'friend.wants': 'Your friend wants to paint with you! Come?',
	'friend.yes': 'Let\'s paint together! Pick a picture.',
	'friend.no': 'Your friend wants to paint alone for now.',
	'friend.finished': 'Your friend finished!',
	'friend.away': 'Your friend went away.',
	'friend.how': 'Want to paint with a friend? Ask a grown-up to help!',
	'friend.pick': 'Tap your friend to paint together!',

	'home.who': 'Who is playing today?',
	'home.what': 'What shall we play?',
	'home.try': 'Shall we try this one?',
	'home.done': 'You did it!',
	'home.sticker': 'Here is your sticker!',
	'home.age': 'How old are you?',
	'home.new': 'A new sticker!',
	'game.spell': 'Spell Pick',
	'game.math': 'Number Dash',
	'game.letters': 'Letter Leap',
	'game.shapes': 'Shape Sense',
	'game.chess': 'Chess Path',
	'game.read': 'Read Along',
	'game.paint': 'Paint Pot'
} satisfies Record<string, Entry>;

export type Key = keyof typeof en;
type FamilyKey = { [K in Key]: (typeof en)[K] extends Family ? K : never }[Key];
type TextKey = Exclude<Key, FamilyKey>;

const nl: Record<Key, Entry> = {
	'lang.name': 'Nederlands',
	praise: ['Goed zo!', 'Ja!', 'Knap!', 'Super!', 'Top!'],
	almost: ['Bijna!', 'Heel dichtbij!'],
	count: { from: 1, to: 12, text: (n) => (n === 1 ? 'Er is er één!' : `Het zijn er ${NUMBERS.nl[n]}!`) },

	'shapes.find.circle': 'Zoek de cirkel.',
	'shapes.find.triangle': 'Zoek de driehoek.',
	'shapes.find.square': 'Zoek het vierkant.',
	'shapes.find.rectangle': 'Zoek de rechthoek.',
	'shapes.howMany.circle': 'Hoeveel cirkels?',
	'shapes.howMany.triangle': 'Hoeveel driehoeken?',
	'shapes.odd': 'Welke is anders?',
	'shapes.next': 'Wat komt hierna?',
	'shapes.fact.circle': 'Een cirkel is rond.',
	'shapes.fact.triangle': 'Een driehoek heeft drie kanten.',
	'shapes.fact.square': 'Een vierkant heeft vier kanten, allemaal even lang.',
	'shapes.fact.rectangle': 'Een rechthoek heeft twee lange en twee korte kanten.',
	'shapes.almost.find': 'Bijna! Kijk goed: rechte kanten, helemaal dicht.',
	'shapes.almost.next': 'Bijna! Kijk naar de kleur.',
	'shapes.almost.count': 'Bijna! Tel nog eens, één voor één.',

	'chess.rule.rook': 'De toren gaat in rechte lijnen.',
	'chess.rule.bishop': 'De loper gaat schuin.',
	'chess.rule.knight': 'Het paard springt: twee stappen, dan één opzij.',
	'chess.rule.pawn': 'Pionnen gaan één stap rechtdoor, en slaan één stap schuin.',
	'chess.star': 'Pak de ster!',
	'chess.stars': 'Pak alle sterren!',
	'chess.guard': 'Pas op voor de rode wachter! Stop niet waar hij je kan pakken.',
	'chess.caught': 'Oei! Daar kan de wachter je pakken.',
	'chess.fewest': 'Zo kort mogelijk!',
	'chess.canDoIn': { from: 1, to: 9, text: (n) => `Het kan in ${NUMBERS.nl[n]} ${n === 1 ? 'zet' : 'zetten'}!` },
	'chess.hex': 'Breng een pion naar de overkant!',
	'chess.lost': 'De computer wint. Nog een keer!',

	'read.go': 'Lees maar hardop!',
	'read.end': 'Einde!',
	'read.needs': 'Voorlezen werkt alleen als ik je kan horen lezen.',
	'read.problem.unsupported': 'Deze browser kan niet luisteren. Open het spel in Chrome, Edge of Safari.',
	'read.problem.denied': 'De microfoon mag niet gebruikt worden. Vraag een volwassene om de microfoon voor deze site toe te staan.',
	'read.problem.nomic': 'Ik kan geen microfoon vinden. Sluit er een aan en probeer het opnieuw.',
	'read.problem.network': 'Luisteren heeft nu internet nodig. Controleer de verbinding en probeer het opnieuw.',
	'read.problem.silent': 'Ik hoor geen woorden. Kijk of de microfoon aan staat en niet gedempt is, en probeer het opnieuw.',

	'paint.go': 'Kies een kleur en schilder maar!',
	'paint.others': 'Kijk wat andere kinderen geschilderd hebben!',
	'friend.here': 'Je vriendje is er!',
	'friend.ask': 'Vraag je vriendje om samen te schilderen?',
	'friend.wants': 'Je vriendje wil samen schilderen! Kom je?',
	'friend.yes': 'Samen schilderen! Kies een plaatje.',
	'friend.no': 'Je vriendje schildert nu even alleen.',
	'friend.finished': 'Je vriendje is klaar!',
	'friend.away': 'Je vriendje is weggegaan.',
	'friend.how': 'Wil je samen met een vriendje schilderen? Vraag een volwassene om te helpen!',
	'friend.pick': 'Tik op je vriendje om samen te schilderen!',

	'home.who': 'Wie speelt er vandaag?',
	'home.what': 'Wat gaan we spelen?',
	'home.try': 'Zullen we deze proberen?',
	'home.done': 'Je hebt het gedaan!',
	'home.sticker': 'Hier is je sticker!',
	'home.age': 'Hoe oud ben je?',
	'home.new': 'Een nieuwe sticker!',
	'game.spell': 'Spelling Kiezen',
	'game.math': 'Rekenrace',
	'game.letters': 'Letter Sprong',
	'game.shapes': 'Vormen Zien',
	'game.chess': 'Schaakpad',
	'game.read': 'Lees Mee',
	'game.paint': 'Verfpot'
};

const CATALOG: Record<Language, Record<Key, Entry>> = { en, nl };
const isFamily = (e: Entry): e is Family => typeof e === 'object' && !Array.isArray(e);

/** A line by key. A list of variants (praise, almost) gives a random one; a family takes its number. */
export function t(lang: Language, key: TextKey): Line;
export function t(lang: Language, key: FamilyKey, n: number): Line;
export function t(lang: Language, key: Key, n?: number): Line {
	const e = CATALOG[lang][key];
	if (typeof e === 'string') return { id: key, text: e };
	if (Array.isArray(e)) {
		const i = Math.floor(Math.random() * e.length);
		return { id: `${key}.${i}`, text: e[i] };
	}
	return { id: `${key}.${n}`, text: e.text(n!) };
}

/** A game's name, by its home-tile id (spell, math, letters, shapes, chess, read, paint). */
export const gameName = (lang: Language, id: string): Line => t(lang, `game.${id}` as TextKey);

/** A word from the word lists, said in lower case. */
export const word = (w: string): Line => ({ id: `word.${w}`, text: w.toLowerCase() });
/** A key's name alone ("bee"), said on every press in Letter Leap; the single-word carrier keeps it short. */
export const keyLine = (lang: Language, l: string): Line => ({ id: `key.${l}`, text: `${l}.` });
/** A letter name, as "the letter A": a lone letter is too short for the voice model, and clearer for a child. */
export const letter = (lang: Language, l: string): Line => ({ id: `letter.${l}`, text: `${lang === 'en' ? 'The letter' : 'De letter'} ${l}.` });
/** A sticker animal, keyed by its English name so ids stay plain ASCII. */
export const animal = (lang: Language, emoji: string): Line => ({
	id: `animal.${STICKERS[emoji].en}`,
	text: STICKERS[emoji][lang]
});

/** Read Along: a story's title, one of its sentences, and a single word of it (said when the child is stuck). */
export const storyTitle = (lang: Language, st: Story): Line => ({ id: `story.${st.id}.title`, text: st.title[lang] });
export const storySentence = (lang: Language, st: Story, i: number): Line => ({
	id: `story.${st.id}.${i}`,
	text: st.sentences[lang][i].text
});
// Ids are file names: plain ASCII, so accents are dropped (één → een) and the word itself is the text.
export const storyWord = (key: string): Line => ({
	id: `sword.${key.normalize('NFD').replace(/\p{M}/gu, '')}`,
	text: key
});

/** Paint Pot: a crayon's colour name, and the praise for a finished picture. */
export const colour = (lang: Language, c: Crayon): Line => ({ id: `colour.${c.id}`, text: c.name[lang] });
export const painted = (lang: Language, p: Picture): Line => ({ id: `paint.done.${p.id}`, text: p.done[lang] });
export const chapterName = (lang: Language, c: Chapter): Line => ({ id: `paint.chapter.${c.id}`, text: c.name[lang] });
export const pictureName = (lang: Language, p: Picture): Line => ({ id: `paint.pic.${p.id}`, text: p.name[lang] });

/** The catalog's own lines in a language: every key, every variant, every number of a family. */
export function catalogLines(lang: Language): Line[] {
	const out: Line[] = [];
	for (const [key, e] of Object.entries(CATALOG[lang])) {
		if (typeof e === 'string') out.push({ id: key, text: e });
		else if (Array.isArray(e)) e.forEach((text, i) => out.push({ id: `${key}.${i}`, text }));
		else if (isFamily(e)) for (let n = e.from; n <= e.to; n++) out.push({ id: `${key}.${n}`, text: e.text(n) });
	}
	return out;
}

/** FNV-1a of a line's text: the manifest stores it, so a clip of an older text is never played. */
export function textHash(text: string): string {
	let h = 0x811c9dc5;
	for (const ch of text) {
		h ^= ch.codePointAt(0)!;
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h.toString(16).padStart(8, '0');
}
