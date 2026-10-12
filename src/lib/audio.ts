import { asset } from '$app/paths';
import { textHash, type Line } from './i18n';
import { LANGUAGES, type Language } from './words';
import manifest from './voice-manifest.json';

/** Clip pace: recorded clips are made at a calm pace for children, which the browser voice gets at rate 0.6. */
const BASE_RATE = 0.6;
const CLIP_GAP_MS = 180;

const clips = manifest as Record<Language, Record<string, string>>;
const hasClip = (l: Line, language: Language) => !!l.id && clips[language]?.[l.id] === textHash(l.text);

// One shared element: iOS only lets an element play later, outside a tap, once a tap has played it.
let player: HTMLAudioElement | null = null;
/** Bumped by every speak/stop, so a sequence that was interrupted stops quietly. */
let run = 0;

/**
 * Say one line or several in a row. Recorded clips play when every line has a current one; otherwise
 * the browser voice says the joined text. onDone fires at the end, on error, or at once without audio.
 * A plain string always uses the browser voice. rate < 0.6 slows clips down too (pitch kept).
 */
export function speak(lines: Line | Line[] | string, language: Language, onDone?: () => void, rate = BASE_RATE) {
	const ls = typeof lines === 'string' ? [{ id: '', text: lines }] : Array.isArray(lines) ? lines : [lines];
	const mine = ++run;
	player?.pause();
	if (typeof Audio !== 'undefined' && ls.every((l) => hasClip(l, language))) {
		if (typeof speechSynthesis !== 'undefined' && (speechSynthesis.speaking || speechSynthesis.pending)) speechSynthesis.cancel();
		player ??= new Audio();
		const p = player;
		let i = 0;
		const next = () => {
			if (mine !== run) return;
			if (i === ls.length) return onDone?.();
			const l = ls[i++];
			p.src = asset(`/voice/${language}/${l.id}.mp3` as Parameters<typeof asset>[0]);
			p.playbackRate = rate / BASE_RATE;
			p.onended = () => (i < ls.length ? setTimeout(next, CLIP_GAP_MS) : next());
			// A clip that won't play: say the rest with the browser voice instead.
			p.onerror = () => mine === run && synth(ls.slice(i - 1).map((x) => x.text).join(' '), language, onDone, rate);
			p.play().catch(() => p.onerror?.(new Event('error')));
		};
		return next();
	}
	synth(ls.map((l) => l.text).join(' '), language, onDone, rate);
}

/**
 * The browser voice. The first call must happen synchronously inside a user gesture (Safari/iOS block it otherwise).
 */
function synth(text: string, language: Language, onDone: (() => void) | undefined, rate: number) {
	const synth = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;
	if (!synth) return onDone?.();
	// Chrome silently drops speak() issued right after cancel(), so only cancel when busy.
	if (synth.speaking || synth.pending) synth.cancel();
	const lang = LANGUAGES.find((l) => l.id === language)!.speechLang;
	const u = new SpeechSynthesisUtterance(text);
	u.lang = lang;
	// lang alone can fall back to a silent/wrong voice; pick one explicitly.
	const voices = synth.getVoices();
	const voice =
		voices.find((v) => v.lang.replace('_', '-') === lang) ?? voices.find((v) => v.lang.startsWith(lang.slice(0, 2)));
	if (voice) u.voice = voice;
	u.rate = rate; // 0.6 default: slow and clear for young children
	u.pitch = 1.2;
	u.onend = u.onerror = () => onDone?.();
	synth.speak(u);
}

export const stopSpeech = () => {
	run++;
	player?.pause();
	if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
};

/** A tiny silent WAV, played inside the first tap to unlock the shared clip player on iOS. */
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

/** Call inside the tap that starts a game: iOS only allows later, delayed speech once speech began in a gesture. */
export function unlockSpeech() {
	if (typeof Audio !== 'undefined') {
		player ??= new Audio();
		player.src = SILENCE;
		player.play().catch(() => {});
	}
	if (typeof speechSynthesis === 'undefined') return;
	const u = new SpeechSynthesisUtterance(' ');
	u.volume = 0;
	speechSynthesis.speak(u);
}

let ctx: AudioContext | null = null;
export let soundOn = { value: true };

function tone(freqs: number[], step: number, length: number, type: OscillatorType = 'sine', gain = 0.15) {
	if (!soundOn.value || typeof AudioContext === 'undefined') return;
	ctx ??= new AudioContext();
	const t0 = ctx.currentTime;
	freqs.forEach((f, i) => {
		const osc = ctx!.createOscillator();
		const g = ctx!.createGain();
		const t = t0 + i * step;
		osc.type = type;
		osc.frequency.setValueAtTime(f, t);
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + length);
		osc.connect(g).connect(ctx!.destination);
		osc.start(t);
		osc.stop(t + length);
	});
}

export const sfx = {
	tok: () => tone([660], 0, 0.08, 'triangle'),
	bloop: () => tone([260, 180], 0.07, 0.14, 'sine', 0.1),
	chime: () => tone([523, 659, 784, 1047], 0.11, 0.35, 'triangle')
};
