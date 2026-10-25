<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { speak, stopSpeech, sfx, unlockSpeech } from '#lib/audio.ts';
	import { storySentence, storyTitle, storyWord, t, type Line } from '#lib/i18n.ts';
	import { Listener, canListen, isProblem, type ListenState, type Problem } from '#lib/listen.ts';
	import {
		WORD_GRADE, align, heardKeys, sentenceGrade, words, type Word, type WordState
	} from '#lib/readalong.ts';
	import type { Grade } from '#lib/score.ts';
	import { READ_LEVELS, STORIES, type Story } from '#lib/stories.ts';
	import { loadLanguage, loadRead, saveLanguage, saveRead, type ReadProgress } from '#lib/storage.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import Icon from '#lib/Icon.svelte';
	import Pip from '#lib/Pip.svelte';
	import Emoji, { glyphs } from '#lib/Emoji.svelte';
	import Reward from '#lib/Reward.svelte';
	import { awardSticker } from '#lib/stickers.ts';
	import { trackPlay } from '#lib/playlog.ts';

	const GLOW_MS = 4000; // no progress this long: the next word glows
	const SAY_MS = 8000; // ...this long: the game says it
	const MOVE_ON_MS = 5000; // ...and this long after saying it, the game moves on
	const NEXT_SENTENCE_MS = 350; // short: a child often reads straight on
	const HEARD_FLASH_MS = 500;
	/** Words moved on by the help with nothing heard at all: then the microphone isn't getting through. */
	const SILENT_MOVES = 2;

	let phase = $state<'start' | 'play' | 'story' | 'reward' | 'problem'>('start');
	/** The story page: which line Pip is reading (-1 the title), and whether the whole story has been read. */
	let reading = $state(-2);
	let storyDone = $state(false);
	let storyTimer = 0;
	const STORY_RATE = 0.5; // slower than the clips' calm pace: this is the story told back, sentence by sentence
	const LINE_FALLBACK_MS = 12000;
	/** Why the game can't listen; 'silent' is a microphone that is on but hears nothing. */
	let problem = $state<Problem | 'silent'>('unsupported');
	let language = $state<Language>('en');
	let progress = $state<ReadProgress>({ v: 1, level: 1, next: {} });
	let listenState = $state<ListenState>('off');
	let supported = $state(true);

	let story = $state<Story>();
	let si = $state(-1); // sentence index; -1 while the title is shown
	let sentence = $state<Word[]>([]);
	let states = $state<(WordState | null)[]>([]);
	let at = $state(0); // words read (or helped) so far in this sentence
	let glow = $state(-1);
	let grades = $state<Grade[]>([]);
	let sentenceDone = $state(false);
	/** The recogniser just heard something (matched or not): the 🎤 bounces, so the child knows it listens. */
	let hearing = $state(false);
	let hearingTimer = 0;
	let newSticker = $state('');

	let listener: Listener | null = null;
	let appSpeaking = false;
	let speechTurn = 0;
	let baseline = 0; // heard words before this point belong to an earlier sentence or the app's own voice
	let basePtr = 0;
	let timers: number[] = [];
	let heardAny = false;
	let silentMoves = 0;

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
			if (isProblem(s) && phase === 'play') showProblem(s);
		});
		const stop = trackPlay('read');
		return () => {
			stopAll();
			stop();
		};
	});

	function stopAll() {
		clearTimers();
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

	/** Listening is the game: when it can't work, stop and say so plainly, and what would fix it. */
	function showProblem(p: Problem | 'silent') {
		stopAll();
		problem = p;
		phase = 'problem';
		say(problemLines());
	}
	const problemLines = () => [t(language, `read.problem.${problem}`), t(language, 'read.needs')];

	function play() {
		unlockSpeech();
		if (!supported) return showProblem('unsupported');
		grades = [];
		heardAny = false;
		silentMoves = 0;
		listener!.start(language); // inside the tap: iOS only starts recognition in a gesture
		const list = storiesAt(progress.level);
		story = list[(progress.next[progress.level] ?? 0) % list.length];
		phase = 'play';
		si = -1;
		sentence = [];
		say([storyTitle(language, story), t(language, 'read.go')], () => later(() => next(), 400));
	}

	/** `carry`: where in the heard words the previous sentence ended, so words read straight on still count. */
	function next(carry?: number) {
		clearTimers();
		si++;
		if (si >= story!.sentences[language].length) return finish();
		sentence = words(story!.sentences[language][si].text);
		states = sentence.map(() => null);
		at = 0;
		glow = -1;
		sentenceDone = false;
		if (carry === undefined) rebase();
		else {
			baseline = carry;
			basePtr = 0;
		}
		armStuck();
		if (carry !== undefined && listener) onHeard(listener.transcript);
	}

	function onHeard(transcript: string) {
		if (phase !== 'play' || appSpeaking || si < 0) return;
		if (transcript) heardAny = true;
		hearing = true;
		clearTimeout(hearingTimer);
		hearingTimer = window.setTimeout(() => (hearing = false), HEARD_FLASH_MS);
		if (sentenceDone) return;
		const keys = heardKeys(transcript);
		if (keys.length < baseline) baseline = 0; // listening restarted from a tap: a fresh transcript
		// Always from the sentence's start: the recogniser keeps revising its guess, but words never un-green.
		const { at: n, used } = align(sentence, keys.slice(baseline), basePtr, language);
		if (n <= at) return;
		for (let i = at; i < n; i++) states[i] ??= glow === i ? 'glowed' : 'read';
		at = n;
		glow = -1;
		if (at >= sentence.length) return done(baseline + used);
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
						if (!heardAny && ++silentMoves >= SILENT_MOVES) return showProblem('silent');
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
		if (i >= at && !states[i]) states[i] = 'said';
		// A tap can cut the stuck-word help short: start its timers again after the word.
		say(storyWord(sentence[i].key), () => !sentenceDone && armStuck(), true);
	}

	function done(carry?: number) {
		clearTimers();
		sentenceDone = true;
		glow = -1;
		grades = [...grades, sentenceGrade(states.map((s) => s ?? 'said'))];
		sfx.tok();
		later(() => next(carry), NEXT_SENTENCE_MS);
	}

	function finish() {
		clearTimers();
		listener?.stop();
		phase = 'story';
		readStory();
		const golds = grades.filter((g) => g === 'gold').length;
		const p = { ...progress, next: { ...progress.next, [progress.level]: (progress.next[progress.level] ?? 0) + 1 } };
		// Every sentence but one read alone: the next story is one level up.
		if (golds >= grades.length - 1 && p.level < READ_LEVELS) p.level++;
		progress = p;
		saveRead(p);
	}

	/** The whole story on one page, read aloud slowly from the title down, each line lit as it is said. */
	function readStory(from = -1) {
		if (!story) return;
		storyDone = false;
		const lines = story.sentences[language];
		const step = (i: number) => {
			clearTimeout(storyTimer);
			if (phase !== 'story') return;
			if (i >= lines.length) {
				reading = -2;
				storyDone = true;
				return;
			}
			reading = i;
			const line = i < 0 ? storyTitle(language, story!) : storySentence(language, story!, i);
			let moved = false;
			const next = () => {
				if (moved) return;
				moved = true;
				storyTimer = window.setTimeout(() => step(i + 1), i < 0 ? 900 : 700);
			};
			speak(line, language, next, STORY_RATE);
			storyTimer = window.setTimeout(next, LINE_FALLBACK_MS);
		};
		stopSpeech();
		step(from);
	}

	function toReward() {
		clearTimeout(storyTimer);
		stopSpeech();
		newSticker = awardSticker();
		phase = 'reward';
		// The reward screen plays the chime and says the praise itself.
	}

	function home() {
		clearTimeout(storyTimer);
		stopAll();
		phase = 'start';
	}

	const wordClass = (i: number) =>
		states[i] && i < at ? WORD_GRADE[states[i]!] : glow === i ? 'glow' : i === at && !sentenceDone ? 'next' : '';
</script>

{#snippet notice(p: Problem | 'silent')}
	<div class="notice" role="alert">
		<div class="nomic" aria-hidden="true"><Icon name="mic" size={88} /><span><Icon name="close" size={40} /></span></div>
		<p class="why">{t(language, `read.problem.${p}`).text}</p>
		<p class="needs">{t(language, 'read.needs').text}</p>
		<button type="button" class="round" aria-label="Hear it" onclick={() => speak([t(language, `read.problem.${p}`), t(language, 'read.needs')], language)}><Icon name="speaker" size={36} /></button>
	</div>
{/snippet}

<main>
	<div class="corner left">
		{#if phase === 'start'}
			<a class="icon" href={resolve('/home')} aria-label="All games"><Icon name="home" size={36} /></a>
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={home}><Icon name="home" size={36} /></button>
		{/if}
	</div>

	{#if phase === 'start'}
		<section class="stage">
			{#if supported}
				<Pip {language} line={t(language, 'read.go')} />
				<button type="button" class="big-btn play" aria-label="Play" onclick={play}><Icon name="play" size={72} /></button>
			{:else}
				{@render notice('unsupported')}
			{/if}
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
						}}><Icon name={l.id} size={34} /></button
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
		</section>
	{:else if phase === 'play' && story}
		<ol class="dots" aria-label="{grades.length} of {story.sentences[language].length}">
			{#each story.sentences[language] as _, i (i)}
				<li class={grades[i]}>{grades[i] ? '★' : ''}</li>
			{/each}
		</ol>
		<section class="stage">
			{#if si < 0}
				<div class="scene cover" aria-hidden="true">{#each glyphs(story.cover) as g, i (i)}<Emoji glyph={g} size="1em" />{/each}</div>
				<p class="title">{story.title[language]}</p>
			{:else}
				{#key si}
					<div class="scene" aria-hidden="true">{#each glyphs(story.sentences[language][si].scene) as g, i (i)}<Emoji glyph={g} size="1em" />{/each}</div>
					<p class="sentence" aria-live="polite">
						{#each sentence as w, i (i)}
							<button type="button" class="word {wordClass(i)}" onclick={() => tapWord(i)}>{w.shown}</button>
						{/each}
					</p>
				{/key}
				<div class="controls">
					<!-- Pip shows the sentence; the tap goes through say() so matching stays muted while the app reads it. -->
					<div
						class="pip-say"
						role="presentation"
						onclickcapture={(e) => {
							e.stopPropagation();
							say(storySentence(language, story!, si));
						}}
					>
						<Pip {language} size={92} line={storySentence(language, story, si)} />
					</div>
					{#if listenState === 'paused'}
						<button type="button" class="round pulse" aria-label="Keep listening" onclick={() => { listener?.resume(); rebase(); }}><Icon name="mic" size={36} /></button>
					{:else}
						<span class="listening" class:on={listenState === 'listening'} class:hearing aria-label="Listening"><Icon name="mic" size={40} /></span>
					{/if}
				</div>
			{/if}
		</section>
	{:else if phase === 'story' && story}
		<section class="stage">
			<ol class="story" aria-label={story.title[language]}>
				<li class="line title-line" class:now={reading === -1}>
					<button type="button" onclick={() => readStory(-1)}>
						<span class="scene small" aria-hidden="true">{#each glyphs(story.cover) as g, i (i)}<Emoji glyph={g} size="1em" />{/each}</span>
						<span class="text title">{story.title[language]}</span>
					</button>
				</li>
				{#each story.sentences[language] as sen, i (i)}
					<li class="line" class:now={reading === i} class:read={reading > i || storyDone}>
						<button type="button" onclick={() => readStory(i)}>
							<span class="scene small" aria-hidden="true">{#each glyphs(sen.scene) as g, i (i)}<Emoji glyph={g} size="1em" />{/each}</span>
							<span class="text">{sen.text}</span>
						</button>
					</li>
				{/each}
			</ol>
			<div class="controls">
				<Pip {language} size={80} mood={storyDone ? 'happy' : 'idle'} line={storyDone ? t(language, 'read.end') : undefined} />
				<button type="button" class="big-btn play" class:faint={!storyDone} aria-label={storyDone ? 'Get your sticker' : 'Skip to the sticker'} onclick={toReward}>
					<Icon name="play" size={56} />
				</button>
			</div>
		</section>
	{:else if phase === 'problem'}
		<section class="stage">
			<div class="notice" role="alert">
				<Pip {language} line={t(language, `read.problem.${problem}`)} size={96} />
				<p class="needs">{t(language, 'read.needs').text}</p>
			</div>
			{#if problem !== 'unsupported'}
				<button type="button" class="big-btn play retry" aria-label="Try again" onclick={play}><Icon name="retry" size={64} /></button>
			{/if}
		</section>
	{:else if phase === 'reward'}
		<section class="stage">
			<Reward {grades} sticker={newSticker} {language} onAgain={play} sayFirst={[t(language, 'read.end')]} />
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
		background: var(--mint);
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

	/* Keycaps: white (or sun) with a solid ink shadow that presses down. */
	.icon,
	.big-btn,
	.flag,
	.lvl,
	.round {
		min-width: var(--tap);
		min-height: var(--tap);
		border: var(--line) solid var(--ink);
		background: var(--white);
		box-shadow: 0 6px 0 var(--ink);
		color: var(--ink);
		text-decoration: none;
		display: grid;
		place-items: center;
		line-height: 1;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.big-btn:active,
	.flag:active,
	.lvl:active,
	.round:active {
		transform: translateY(6px);
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		border-radius: 50%;
	}
	.big-btn {
		border-radius: 22px;
	}
	.play {
		width: clamp(8rem, 26vw, 12rem);
		height: clamp(8rem, 26vw, 12rem);
		background: var(--sun);
		padding-left: 0.4rem;
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
	}
	.lvl {
		border-radius: 50%;
		font-family: var(--title);
		font-size: 1.7rem;
		font-weight: 700;
	}
	.flag[aria-pressed='true'],
	.lvl[aria-pressed='true'] {
		background: var(--sun);
		box-shadow: 0 6px 0 var(--ink), 0 0 0 6px var(--ink);
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
	.dots li.gold {
		background: var(--sun);
	}
	.dots li.silver {
		background: var(--silver);
	}
	.dots li.bronze {
		background: var(--bronze);
	}

	.scene {
		font-size: clamp(4rem, 16vw, 7.5rem);
		line-height: 1;
		display: flex;
		justify-content: center;
		gap: 0.15em;
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
	.word.gold {
		background: #b8e6b0;
	}
	.word.silver {
		background: #ffe2a8;
	}
	.word.bronze {
		background: #f2c9a8;
	}
	/* Where to read next: a thick underline, so the child keeps their place. */
	.word.next {
		text-decoration: underline;
		text-decoration-thickness: 0.12em;
		text-underline-offset: 0.18em;
		text-decoration-color: var(--sun);
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
		border-radius: 50%;
	}
	/* Can't listen: say so plainly, big enough for a parent to read from across the room. */
	.notice {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		max-width: min(36rem, 92vw);
		text-align: center;
	}
	.nomic {
		position: relative;
		line-height: 0;
	}
	.nomic span {
		position: absolute;
		right: -1rem;
		bottom: -0.4rem;
		color: var(--red);
	}
	.why {
		margin: 0;
		font-size: clamp(1.4rem, 4.5vw, 2rem);
		font-weight: 700;
	}
	.needs {
		margin: 0;
		font-size: clamp(1.1rem, 3.5vw, 1.5rem);
	}
	.retry {
		padding-left: 0;
	}
	.pulse {
		animation: glow 0.8s ease-in-out infinite alternate;
	}
	.listening {
		display: grid;
		opacity: 0.3;
	}
	.listening.on {
		opacity: 1;
		animation: breathe 1.6s ease-in-out infinite;
	}
	.listening.hearing {
		animation: bounce 250ms ease-out;
	}
	@keyframes bounce {
		50% {
			transform: scale(1.45) translateY(-4px);
		}
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
	@media (prefers-reduced-motion: reduce) {
		.scene,
		.word.glow,
		.pulse,
		.listening.on {
			animation: none;
		}
	}

	/* The story page: the whole fable, one line at a time lit as Pip reads it. */
	.story {
		list-style: none;
		margin: 0;
		padding: 0.8rem;
		width: min(44rem, 94vw);
		max-height: calc(100dvh - 15rem);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		border: var(--line) solid var(--ink);
		border-radius: 24px;
		background: var(--white);
	}
	.line button {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.6rem 0.9rem;
		border: 3px solid transparent;
		border-radius: 18px;
		background: none;
		text-align: left;
		font: inherit;
		color: var(--mute);
		transition: background-color 150ms, color 150ms;
	}
	.line.read button,
	.title-line button {
		color: var(--ink);
	}
	.line.now button {
		background: var(--butter);
		border-color: var(--ink);
		color: var(--ink);
	}
	.scene.small {
		font-size: 1.6rem;
		line-height: 1;
		flex: none;
		width: 5.4rem;
		gap: 0.1em;
	}
	.text {
		font-size: clamp(1.3rem, 3.4vw, 1.8rem);
		line-height: 1.3;
	}
	.text.title {
		font-family: var(--title);
		font-weight: 700;
	}
	.play.faint {
		opacity: 0.55;
	}
</style>
