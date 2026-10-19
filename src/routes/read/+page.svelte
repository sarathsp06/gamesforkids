<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { speak, stopSpeech, sfx, unlockSpeech } from '#lib/audio.ts';
	import { storySentence, storyTitle, storyWord, t, type Line } from '#lib/i18n.ts';
	import { Listener, canListen, type ListenState } from '#lib/listen.ts';
	import {
		WORD_GRADE, align, heardKeys, sentenceGrade, wordStarts, words, type Word, type WordState
	} from '#lib/readalong.ts';
	import type { Grade } from '#lib/score.ts';
	import { READ_LEVELS, STORIES, type Story } from '#lib/stories.ts';
	import { loadLanguage, loadRead, saveLanguage, saveRead, type ReadProgress } from '#lib/storage.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';

	const GLOW_MS = 4000; // no progress this long: the next word glows
	const SAY_MS = 8000; // ...this long: the game says it
	const MOVE_ON_MS = 5000; // ...and this long after saying it, the game moves on
	const NEXT_SENTENCE_MS = 900;
	const HOLD_MS = 3000; // the parent hold on the microphone switch

	let phase = $state<'start' | 'play' | 'reward'>('start');
	let language = $state<Language>('en');
	let progress = $state<ReadProgress>({ v: 1, level: 1, mic: false, next: {} });
	let listenState = $state<ListenState>('off');
	let supported = $state(true);

	let story = $state<Story>();
	let si = $state(-1); // sentence index; -1 while the title is shown
	let sentence = $state<Word[]>([]);
	let states = $state<(WordState | null)[]>([]);
	let at = $state(0); // words read (or helped) so far in this sentence
	let glow = $state(-1);
	let lit = $state(-1); // read-to-me: the word being said
	let grades = $state<Grade[]>([]);
	let sentenceDone = $state(false);
	let readToMe = $state(false);

	let listener: Listener | null = null;
	let appSpeaking = false;
	let speechTurn = 0;
	let baseline = 0; // heard words before this point belong to an earlier sentence or the app's own voice
	let basePtr = 0;
	let timers: number[] = [];
	let holding = $state(false);
	let holdTimer = 0;

	const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
	const clearTimers = () => {
		timers.forEach(clearTimeout);
		timers = [];
	};

	onMount(() => {
		language = loadLanguage();
		progress = loadRead();
		supported = canListen();
		listener = new Listener(onHeard, (s) => {
			listenState = s;
			// Refused or not available mid-story: read the rest to the child.
			if (s === 'denied' && phase === 'play' && !readToMe) {
				readToMe = true;
				say(t(language, 'read.noMic'), () => !sentenceDone && readSentenceToMe());
			}
		});
		return stopAll;
	});

	function stopAll() {
		clearTimers();
		clearTimeout(holdTimer);
		listener?.stop();
		stopSpeech();
	}

	/**
	 * Speak. A whole sentence (or the title) mutes matching meanwhile: the microphone would hear the app's own
	 * voice and turn the words green. A single help word doesn't (`keepListening`): it is already marked as
	 * said, and the child often repeats it straight away.
	 */
	function say(lines: Line | Line[], after?: () => void, keepListening = false) {
		appSpeaking = !keepListening;
		const ls = Array.isArray(lines) ? lines : [lines];
		const turn = ++speechTurn;
		const end = () => {
			if (turn !== speechTurn) return; // a newer speech took over, or this one already ended
			speechTurn++;
			if (!keepListening) {
				appSpeaking = false;
				rebase();
			}
			after?.();
		};
		speak(ls, language, end);
		// The browser voice sometimes never reports its end (Chrome): carry on anyway.
		window.setTimeout(end, 2500 + ls.reduce((n, l) => n + l.text.length, 0) * 150);
	}
	function rebase() {
		baseline = listener ? heardKeys(listener.transcript).length : 0;
		basePtr = at;
	}

	const storiesAt = (level: number) => STORIES.filter((s) => s.level === level);
	const useMic = () => progress.mic && supported && listenState !== 'denied';

	function play() {
		grades = [];
		readToMe = !useMic();
		unlockSpeech();
		if (!readToMe) listener!.start(language); // inside the tap: iOS only starts recognition in a gesture
		const list = storiesAt(progress.level);
		story = list[(progress.next[progress.level] ?? 0) % list.length];
		phase = 'play';
		si = -1;
		sentence = [];
		say([storyTitle(language, story), t(language, readToMe ? 'read.listen' : 'read.go')], () => later(() => next(), 400));
	}

	function next() {
		clearTimers();
		si++;
		if (si >= story!.sentences[language].length) return finish();
		sentence = words(story!.sentences[language][si].text);
		states = sentence.map(() => null);
		at = 0;
		glow = -1;
		lit = -1;
		sentenceDone = false;
		rebase();
		if (readToMe) readSentenceToMe();
		else armStuck();
	}

	function onHeard(transcript: string) {
		if (phase !== 'play' || appSpeaking || sentenceDone || readToMe || si < 0) return;
		const keys = heardKeys(transcript);
		if (keys.length < baseline) baseline = 0; // listening restarted from a tap: a fresh transcript
		const n = align(sentence, keys.slice(baseline), basePtr, language);
		if (n <= at) return;
		for (let i = at; i < n; i++) states[i] ??= glow === i ? 'glowed' : 'read';
		at = n;
		glow = -1;
		if (at >= sentence.length) return done();
		armStuck();
	}

	/** Read Along's help: glow the word, then say it, then move on, so no word can trap the child. */
	function armStuck() {
		clearTimers();
		const word = at;
		later(() => (glow = word), GLOW_MS);
		later(() => {
			states[word] = 'said';
			say(
				storyWord(sentence[word].key),
				() =>
					later(() => {
						if (at !== word || sentenceDone) return;
						at = word + 1;
						glow = -1;
						rebase();
						if (at >= sentence.length) done();
						else armStuck();
					}, MOVE_ON_MS),
				true
			);
		}, SAY_MS);
	}

	function tapWord(i: number) {
		if (phase !== 'play' || sentenceDone) return;
		if (!readToMe && i >= at && !states[i]) states[i] = 'said';
		// A tap can cut the stuck-word help short: start its timers again after the word.
		say(storyWord(sentence[i].key), () => !readToMe && !sentenceDone && armStuck(), true);
	}

	function done() {
		clearTimers();
		sentenceDone = true;
		glow = -1;
		grades = [...grades, sentenceGrade(states.map((s) => s ?? 'said'))];
		sfx.tok();
		later(next, NEXT_SENTENCE_MS);
	}

	/** Without a microphone: say the sentence and light each word as it goes; the child taps ▶. */
	function readSentenceToMe() {
		clearTimers();
		const text = story!.sentences[language][si].text;
		// Clips are made at a calm pace (about 11 characters a second); the sweep follows that estimate.
		const starts = wordStarts(sentence, text.length / 11 + 0.3);
		starts.forEach((s, i) => later(() => (lit = i), s * 1000));
		say(storySentence(language, story!, si), () => {
			clearTimers();
			lit = sentence.length;
			sentenceDone = true;
		});
	}

	function finish() {
		clearTimers();
		listener?.stop();
		phase = 'reward';
		const golds = grades.filter((g) => g === 'gold').length;
		const p = { ...progress, next: { ...progress.next, [progress.level]: (progress.next[progress.level] ?? 0) + 1 } };
		// Every sentence but one read alone: the next story is one level up. Read-to-me has no stars.
		if (!readToMe && golds >= grades.length - 1 && p.level < READ_LEVELS) p.level++;
		progress = p;
		saveRead(p);
		sfx.chime();
		say([t(language, 'praise'), t(language, 'read.end')]);
	}

	function home() {
		stopAll();
		phase = 'start';
	}

	/** The microphone switch is a parent's decision: hold it for three seconds. */
	function holdStart() {
		if (!supported) return say(t(language, 'read.noMic'));
		holding = true;
		holdTimer = window.setTimeout(() => {
			holding = false;
			progress = { ...progress, mic: !progress.mic };
			saveRead(progress);
			sfx.chime();
			say(t(language, progress.mic ? 'read.micOn' : 'read.micOff'));
		}, HOLD_MS);
	}
	function holdEnd() {
		holding = false;
		clearTimeout(holdTimer);
	}

	const wordClass = (i: number) =>
		readToMe
			? i < lit || (i === lit && sentenceDone) ? 'lit' : i === lit ? 'now' : ''
			: states[i] && i < at ? WORD_GRADE[states[i]!] : glow === i ? 'glow' : '';
</script>

<main>
	<div class="corner left">
		{#if phase === 'start'}
			<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={home}>⌂</button>
		{/if}
	</div>

	{#if phase === 'start'}
		<section class="stage">
			<button type="button" class="big-btn play" aria-label="Play" onclick={play}>▶</button>
			<div class="flags" role="group" aria-label="Language">
				{#each LANGUAGES as l (l.id)}
					<button
						type="button"
						class="flag"
						aria-label={l.name}
						aria-pressed={language === l.id}
						onclick={() => {
							language = l.id;
							saveLanguage(l.id);
							speak(t(l.id, 'lang.name'), l.id);
						}}>{l.flag}</button
					>
				{/each}
			</div>
			<div class="levels" role="group" aria-label="Level">
				{#each Array.from({ length: READ_LEVELS }, (_, i) => i + 1) as l (l)}
					<button
						type="button"
						class="lvl"
						aria-label="Level {l}"
						aria-pressed={progress.level === l}
						onclick={() => {
							progress = { ...progress, level: l };
							saveRead(progress);
						}}>{l}</button
					>
				{/each}
			</div>
			<button
				type="button"
				class="mic"
				class:on={progress.mic && supported}
				class:holding
				aria-label={!supported ? 'This browser cannot listen' : progress.mic ? 'Microphone on: hold 3 seconds to turn off' : 'Microphone off: a parent holds 3 seconds to turn on'}
				onpointerdown={holdStart}
				onpointerup={holdEnd}
				onpointerleave={holdEnd}
				oncontextmenu={(e) => e.preventDefault()}
			>
				<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="16" /></svg>
				<span>{supported && progress.mic ? '🎤' : '🔇'}</span>
			</button>
		</section>
	{:else if phase === 'play' && story}
		<ol class="dots" aria-label="{grades.length} of {story.sentences[language].length}">
			{#each story.sentences[language] as _, i (i)}
				<li class={grades[i]}>{grades[i] ? '★' : ''}</li>
			{/each}
		</ol>
		<section class="stage">
			{#if si < 0}
				<div class="scene cover" aria-hidden="true">{story.cover}</div>
				<p class="title">{story.title[language]}</p>
			{:else}
				{#key si}
					<div class="scene" aria-hidden="true">{story.sentences[language][si].scene}</div>
					<p class="sentence" aria-live="polite">
						{#each sentence as w, i (i)}
							<button type="button" class="word {wordClass(i)}" onclick={() => tapWord(i)}>{w.shown}</button>
						{/each}
					</p>
				{/key}
				<div class="controls">
					<button type="button" class="round" aria-label="Hear the sentence" onclick={() => say(storySentence(language, story!, si))}>🔊</button>
					{#if !readToMe && listenState === 'paused'}
						<button type="button" class="round pulse" aria-label="Keep listening" onclick={() => { listener?.resume(); rebase(); }}>🎤</button>
					{:else if !readToMe}
						<span class="listening" class:on={listenState === 'listening'} aria-label="Listening">🎤</span>
					{/if}
					{#if readToMe && sentenceDone}
						<button type="button" class="round next" aria-label="Next" onclick={next}>▶</button>
					{/if}
				</div>
			{/if}
		</section>
	{:else if phase === 'reward' && story}
		{@const golds = grades.filter((g) => g === 'gold').length}
		<section class="stage">
			<div class="trophy" aria-label="Story done">{readToMe ? '📖' : golds === grades.length ? '🏆' : golds >= grades.length - 2 ? '🥇' : '🥈'}</div>
			<div class="stars" aria-hidden="true">
				{#each grades as g, i (i)}
					<span class={g} style="--d: {i * 120}ms">★</span>
				{/each}
			</div>
			<button type="button" class="big-btn play" aria-label="Next story" onclick={play}>▶</button>
		</section>
	{/if}
</main>

<style>
	main {
		position: relative;
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 5.5rem 1rem 2rem;
		overflow: hidden;
	}
	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1rem, 3.5vh, 2.2rem);
		width: 100%;
	}
	.corner {
		position: absolute;
		top: 1rem;
		left: 1rem;
	}

	.icon,
	.big-btn,
	.flag,
	.lvl,
	.mic,
	.round {
		border: var(--line) solid var(--ink);
		background: var(--paper);
		box-shadow: 0 var(--line) 0 var(--ink);
		color: inherit;
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.big-btn:active,
	.flag:active,
	.lvl:active,
	.round:active {
		transform: translateY(var(--line));
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		font-size: 1.9rem;
		line-height: 1;
		display: grid;
		place-items: center;
	}
	.big-btn {
		border-radius: 22px;
		display: grid;
		place-items: center;
		line-height: 1;
	}
	.play {
		width: clamp(8rem, 26vw, 12rem);
		height: clamp(8rem, 26vw, 12rem);
		background: var(--sun);
		font-size: clamp(3.5rem, 11vw, 5.5rem);
		padding-left: 0.4em;
	}
	.flags,
	.levels {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}
	.flags {
		gap: 2rem;
	}
	.flag {
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		font-size: 2.4rem;
	}
	.lvl {
		width: 3.6rem;
		height: 3.6rem;
		border-radius: 50%;
		font: inherit;
		font-size: 1.7rem;
		font-weight: 700;
	}
	.flag[aria-pressed='true'],
	.lvl[aria-pressed='true'] {
		box-shadow: 0 var(--line) 0 var(--ink), 0 0 0 6px var(--ink);
	}

	/* Microphone switch: a ring fills while a parent holds it. */
	.mic {
		position: relative;
		width: 4.2rem;
		height: 4.2rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: 1.9rem;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}
	.mic.on {
		background: var(--leaf);
	}
	.mic svg {
		position: absolute;
		inset: -10px;
		width: calc(100% + 20px);
		height: calc(100% + 20px);
		transform: rotate(-90deg);
		pointer-events: none;
	}
	.mic circle {
		fill: none;
		stroke: var(--sun);
		stroke-width: 3;
		stroke-dasharray: 101;
		stroke-dashoffset: 101;
	}
	.mic.holding circle {
		stroke-dashoffset: 0;
		transition: stroke-dashoffset 3s linear;
	}

	.dots {
		position: absolute;
		top: 1.4rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 0.45rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.dots li {
		width: clamp(1.3rem, 5vw, 2.1rem);
		height: clamp(1.3rem, 5vw, 2.1rem);
		border: 3px solid var(--ink);
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: clamp(0.8rem, 3vw, 1.3rem);
		line-height: 1;
	}
	.dots li.gold,
	.stars span.gold {
		background: var(--sun);
	}
	.dots li.silver,
	.stars span.silver {
		background: #c9ced6;
	}
	.dots li.bronze,
	.stars span.bronze {
		background: #e0a172;
	}

	.scene {
		font-size: clamp(4rem, 16vw, 7.5rem);
		line-height: 1;
		letter-spacing: 0.1em;
		animation: drop 300ms cubic-bezier(0.3, 1.4, 0.6, 1) backwards;
	}
	.title {
		margin: 0;
		font-size: clamp(1.8rem, 6vw, 2.8rem);
		font-weight: 700;
		text-align: center;
	}
	.sentence {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.35em 0.4em;
		max-width: min(46rem, 94vw);
		font-size: clamp(1.9rem, 6.5vw, 3.2rem);
		line-height: 1.25;
	}
	.word {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		border-radius: 12px;
		padding: 0.05em 0.2em;
		transition: background 200ms;
	}
	.word.gold,
	.word.lit {
		background: #b8e6b0;
	}
	.word.silver {
		background: #ffe2a8;
	}
	.word.bronze {
		background: #f2c9a8;
	}
	.word.now {
		background: var(--sun);
	}
	.word.glow {
		animation: glow 0.8s ease-in-out infinite alternate;
	}
	@keyframes glow {
		to {
			background: var(--sun);
		}
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 1.2rem;
	}
	.round {
		width: 4.2rem;
		height: 4.2rem;
		border-radius: 50%;
		font-size: 1.9rem;
		display: grid;
		place-items: center;
	}
	.round.next {
		background: var(--sun);
		padding-left: 0.2em;
	}
	.pulse {
		animation: glow 0.8s ease-in-out infinite alternate;
	}
	.listening {
		font-size: 2rem;
		opacity: 0.3;
	}
	.listening.on {
		opacity: 1;
		animation: breathe 1.6s ease-in-out infinite;
	}
	@keyframes breathe {
		50% {
			transform: scale(1.15);
		}
	}

	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-0.8rem) scale(0.9);
		}
	}
	@keyframes cheer {
		30% {
			transform: scale(1.08);
		}
	}
	.trophy {
		font-size: clamp(6rem, 24vw, 10rem);
		line-height: 1;
		animation: cheer 500ms ease-in-out;
	}
	.stars {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.6rem;
	}
	.stars span {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 3px solid var(--ink);
		border-radius: 50%;
		font-size: 1.6rem;
		line-height: 1;
		animation: drop 400ms cubic-bezier(0.3, 1.6, 0.6, 1) backwards;
		animation-delay: var(--d);
	}
	@media (prefers-reduced-motion: reduce) {
		.scene,
		.word.glow,
		.pulse,
		.listening.on,
		.stars span,
		.trophy {
			animation: none;
		}
	}
</style>
