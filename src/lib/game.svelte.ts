import { speak, stopSpeech, sfx, soundOn, unlockSpeech } from './audio';
import {
	loadLanguage, loadProgress, loadSessions, saveLanguage, saveProgress, saveSessions,
	defaultProgress, type Progress, type SessionStats
} from './storage';
import { MAX_TIER, pickWord, type Language } from './words';
import { keyLine, letter as letterLine, t, word } from './i18n';
import { gradeAttempts, keySimilarity, type Grade } from './score';
import { awardSticker } from './stickers';

export type Phase = 'start' | 'listening' | 'typing' | 'wordDone' | 'reward';

export const ROUND_WORDS = 5;
const REVEAL_FALLBACK_MS = 4000;
const BREATHE_MS = 900; // small pause before each word is spoken
const IDLE_MS = 8000;
const MAX_IDLE_REPLAYS = 2;
const NEXT_AFTER_PRAISE_MS = 600;
const NEXT_FALLBACK_MS = 3000;
const TIER_UP_MAX_MISSES = 3;
const TIER_DOWN_MIN_MISSES = 10;

const random = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

class Game {
	phase = $state<Phase>('start');
	language = $state<Language>('en');
	progress = $state<Progress>(defaultProgress());
	sessions = $state<SessionStats[]>([]);
	word = $state('');
	index = $state(0);
	/** Bumped on each press so components can replay one-shot animations. */
	lastPress = $state<{ ok: boolean; n: number }>({ ok: true, n: 0 });
	/** Next key pulses after an idle replay or a miss. */
	hint = $state(false);
	roundWords = $state(0);
	/** Grade per finished word this round: gold / silver / bronze stars. */
	grades = $state<Grade[]>([]);
	newSticker = $state('');

	#missesOnLetter = 0;
	#idleReplays = 0;
	#roundMisses = 0;
	/** Similarity of each wrong press on the current word. */
	#wrongSims: number[] = [];
	#session = { startedAt: 0, correct: 0, total: 0, words: 0, streak: 0, longestStreak: 0, stickers: 0 };
	#timers: number[] = [];

	load() {
		this.language = loadLanguage();
		this.progress = loadProgress();
		this.sessions = loadSessions();
		soundOn.value = this.progress.sound;
	}

	setLanguage(l: Language) {
		this.language = l;
		saveLanguage(l);
	}

	updateProgress(patch: Partial<Progress>) {
		this.progress = { ...this.progress, ...patch };
		soundOn.value = this.progress.sound;
		saveProgress(this.progress);
	}

	#later(fn: () => void, ms: number) {
		this.#timers.push(window.setTimeout(fn, ms));
	}
	#clearTimers() {
		this.#timers.forEach(clearTimeout);
		this.#timers = [];
	}

	/** Call from a click/key handler: the first speech must start inside a user gesture. */
	play() {
		if (this.phase === 'start') {
			this.#session = { startedAt: Date.now(), correct: 0, total: 0, words: 0, streak: 0, longestStreak: 0, stickers: 0 };
		}
		this.roundWords = 0;
		this.grades = [];
		this.#roundMisses = 0;
		unlockSpeech(); // the word itself is spoken after a pause, outside the gesture
		this.#nextWord();
	}

	#nextWord() {
		this.word = pickWord(this.language, this.progress.tier);
		this.index = 0;
		this.#missesOnLetter = 0;
		this.#wrongSims = [];
		this.#idleReplays = 0;
		this.hint = false;
		this.#clearTimers();
		this.phase = 'listening';
		let revealed = false;
		const reveal = () => {
			if (revealed || this.phase !== 'listening') return;
			revealed = true;
			this.phase = 'typing';
			this.#armIdle();
		};
		this.#later(() => speak(word(this.word), this.language, reveal), BREATHE_MS);
		this.#later(reveal, BREATHE_MS + REVEAL_FALLBACK_MS); // Chrome sometimes never fires onend
	}

	replay() {
		if (this.phase !== 'typing') return;
		speak(word(this.word), this.language);
		this.#armIdle();
	}

	#armIdle() {
		this.#clearTimers();
		if (this.#idleReplays >= MAX_IDLE_REPLAYS) return;
		this.#later(() => {
			this.#idleReplays++;
			this.hint = true;
			speak(word(this.word), this.language);
			this.#armIdle();
		}, IDLE_MS);
	}

	press(key: string) {
		if (this.phase !== 'typing') return;
		const letter = key.toUpperCase();
		if (!/^[A-Z]$/.test(letter)) return;
		const target = this.word[this.index];
		const s = this.#session;
		s.total++;
		if (letter === target) {
			s.correct++;
			s.streak++;
			s.longestStreak = Math.max(s.longestStreak, s.streak);
			this.index++;
			this.#missesOnLetter = 0;
			this.hint = false;
			this.lastPress = { ok: true, n: this.lastPress.n + 1 };
			sfx.tok();
			if (this.index === this.word.length) this.#wordDone();
			else {
				speak(keyLine(this.language, letter), this.language); // every key says its name
				this.#armIdle();
			}
		} else {
			s.streak = 0;
			this.#roundMisses++;
			this.#missesOnLetter++;
			this.#wrongSims.push(keySimilarity(letter, target));
			this.hint = true;
			this.lastPress = { ok: false, n: this.lastPress.n + 1 };
			sfx.bloop();
			// The pressed key says its name; on the second miss, the one wanted is named in full.
			speak(this.#missesOnLetter === 2 ? [keyLine(this.language, letter), letterLine(this.language, target)] : keyLine(this.language, letter), this.language);
			this.#armIdle();
		}
	}

	#wordDone() {
		this.#clearTimers();
		this.phase = 'wordDone';
		this.#session.words++;
		this.roundWords++;
		this.grades = [...this.grades, gradeAttempts(this.#wrongSims)];
		let done = false;
		const next = () => {
			if (done || this.phase !== 'wordDone') return;
			done = true;
			this.#clearTimers();
			if (this.roundWords >= ROUND_WORDS) this.#reward();
			else this.#nextWord();
		};
		// One utterance: a second speak() would cancel the first.
		speak([word(this.word), t(this.language, 'praise')], this.language, () =>
			this.#later(next, NEXT_AFTER_PRAISE_MS)
		);
		this.#later(next, NEXT_FALLBACK_MS);
	}

	#reward() {
		this.newSticker = awardSticker(); // the current player's book
		let tier = this.progress.tier;
		if (this.progress.tierMode === 'auto') {
			if (this.#roundMisses <= TIER_UP_MAX_MISSES) tier = Math.min(MAX_TIER, tier + 1);
			else if (this.#roundMisses >= TIER_DOWN_MIN_MISSES) tier = Math.max(1, tier - 1);
		}
		this.updateProgress({ tier });
		this.#session.stickers++;
		this.phase = 'reward'; // the shared Reward screen plays the chime and says the praise
	}

	home() {
		this.#clearTimers();
		stopSpeech();
		if (this.phase !== 'start') this.#saveSession();
		this.phase = 'start';
	}

	#saveSession() {
		const s = this.#session;
		if (s.total === 0) return;
		const minutes = (Date.now() - s.startedAt) / 60000;
		const record: SessionStats = {
			id: new Date().toISOString() + Math.random().toString(16).slice(2),
			date: new Date().toISOString(),
			accuracy: +((s.correct / s.total) * 100).toFixed(2),
			wpm: minutes > 0 ? Math.round(s.correct / 5 / minutes) : 0,
			lettersTyped: s.correct,
			wordsTyped: s.words,
			durationMinutes: +minutes.toFixed(2),
			longestStreak: s.longestStreak,
			tier: this.progress.tier,
			language: this.language,
			stickers: s.stickers
		};
		this.sessions = [record, ...this.sessions].slice(0, 10);
		saveSessions(this.sessions);
	}
}

export const game = new Game();
