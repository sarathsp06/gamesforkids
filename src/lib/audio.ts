import { LANGUAGES, type Language } from './words';

/**
 * Speak text in the given language. onDone fires on end, on error, or at once when TTS is missing.
 * The first call must happen synchronously inside a user gesture (Safari/iOS block it otherwise).
 */
export function speak(text: string, language: Language, onDone?: () => void, rate = 0.6) {
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

export const stopSpeech = () => typeof speechSynthesis !== 'undefined' && speechSynthesis.cancel();

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
