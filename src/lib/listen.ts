/**
 * Listening for Read Along: a thin wrapper around the browser's speech recognition (Web Speech API).
 *
 * Runs on the device when the browser can (Chrome's processLocally), otherwise the browser's own speech
 * service does it (Apple on iPad, Google in Chrome). The app itself keeps no audio. Recognition keeps
 * running across sentences and is restarted when the browser stops it after a silence; if a restart
 * outside a tap is refused (iOS), the state becomes 'paused' and the page shows a 🎤 button to resume.
 */
import { LANGUAGES, type Language } from './words';

export type ListenState = 'off' | 'starting' | 'listening' | 'paused' | 'denied' | 'unsupported';

// The Web Speech API is not in TypeScript's DOM types; this is the part we use.
interface Recognition extends EventTarget {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	processLocally?: boolean;
	start(): void;
	stop(): void;
	abort(): void;
	onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
	onend: (() => void) | null;
	onerror: ((e: { error: string }) => void) | null;
	onstart: (() => void) | null;
}
type RecognitionClass = (new () => Recognition) & {
	available?: (o: { langs: string[]; processLocally: boolean }) => Promise<string>;
};

const RecognitionImpl = (): RecognitionClass | null =>
	typeof window === 'undefined'
		? null
		: ((window as unknown as Record<string, RecognitionClass>).SpeechRecognition ??
			(window as unknown as Record<string, RecognitionClass>).webkitSpeechRecognition ??
			null);

export const canListen = () => RecognitionImpl() !== null;

export class Listener {
	state: ListenState = 'off';
	/** Everything heard since start(), across restarts: finished parts plus the current interim guess. */
	#done = '';
	#now = '';
	#rec: Recognition | null = null;
	#wanted = false;
	#lang: Language = 'en';

	constructor(
		private onHeard: (transcript: string) => void,
		private onState: (s: ListenState) => void
	) {}

	get transcript() {
		return `${this.#done} ${this.#now}`.trim();
	}

	#set(s: ListenState) {
		this.state = s;
		this.onState(s);
	}

	/** Call from a tap: iOS only starts recognition inside a user gesture. */
	start(lang: Language) {
		const Impl = RecognitionImpl();
		if (!Impl) return this.#set('unsupported');
		this.#lang = lang;
		this.#wanted = true;
		this.#done = '';
		this.#now = '';
		const rec = new Impl();
		rec.lang = LANGUAGES.find((l) => l.id === lang)!.speechLang;
		rec.continuous = true;
		rec.interimResults = true;
		rec.onstart = () => this.#set('listening');
		rec.onresult = (e) => {
			// Each session's results are the whole session so far; earlier sessions are kept in #done.
			let text = '';
			for (let i = 0; i < e.results.length; i++) text += ' ' + e.results[i][0].transcript;
			this.#now = text.trim();
			this.onHeard(this.transcript);
		};
		rec.onerror = (e) => {
			if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
				this.#wanted = false;
				this.#set('denied');
			}
		};
		rec.onend = () => {
			this.#done = this.transcript;
			this.#now = '';
			if (!this.#wanted) return this.state === 'denied' || this.#set('off');
			try {
				rec.start(); // the browser stops after a silence: carry on
			} catch {
				this.#set('paused');
			}
		};
		this.#rec = rec;
		this.#set('starting');
		// On-device when the browser has it for this language; never waits on it to start.
		const local = Impl.available?.({ langs: [rec.lang], processLocally: true });
		local?.then((a) => a === 'available' && (rec.processLocally = true)).catch(() => {});
		try {
			rec.start();
		} catch {
			this.#set('paused');
		}
	}

	/** Resume after 'paused', from a tap. */
	resume() {
		this.start(this.#lang);
	}

	stop() {
		this.#wanted = false;
		this.#rec?.abort();
		this.#rec = null;
		this.#set('off');
	}
}
