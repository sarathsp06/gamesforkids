/**
 * Every line that can be spoken, in a language: the clip generator renders one clip per id. Kept out of
 * i18n.ts so that pages, which only need a few lines each, don't carry every story, word list and picture.
 * Plain Node-safe module.
 */
import { WORDS, STICKERS, type Language } from './words';
import { SPELL_WORDS } from './spell';
import { STORIES } from './stories';
import { wordKey, words } from './readalong';
import { BLANK, CHAPTERS, CRAYONS, PICTURES } from './paint';
import {
	animal, catalogLines, chapterName, colour, keyLine, letter, painted, pictureName, storySentence, storyTitle,
	storyWord, word, type Line
} from './i18n';

export function allLines(lang: Language): Line[] {
	const out: Line[] = catalogLines(lang);
	for (const w of new Set([...WORDS[lang], ...SPELL_WORDS[lang]])) out.push(word(w));
	for (const l of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') out.push(letter(lang, l), keyLine(lang, l));
	for (const emoji of Object.keys(STICKERS)) out.push(animal(lang, emoji));
	const storyWords = new Set<string>();
	for (const st of STORIES) {
		out.push(storyTitle(lang, st));
		st.sentences[lang].forEach((sen, i) => {
			out.push(storySentence(lang, st, i));
			for (const w of words(sen.text)) storyWords.add(wordKey(w.shown));
		});
	}
	for (const w of storyWords) out.push(storyWord(w));
	for (const c of CRAYONS) out.push(colour(lang, c));
	for (const p of PICTURES) out.push(painted(lang, p));
	for (const c of CHAPTERS) out.push(chapterName(lang, c));
	for (const p of PICTURES) out.push(pictureName(lang, p));
	out.push(pictureName(lang, BLANK), painted(lang, BLANK));
	return out;
}
