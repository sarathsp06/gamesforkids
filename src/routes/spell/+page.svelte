<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { speak, stopSpeech, sfx, unlockSpeech } from '#lib/audio.ts';
	import { SPELL_LEVELS, SPELL_WORDS, choices, pickSpellWord, similarity } from '#lib/spell.ts';
	import { NEAR, gradeAttempts, type Grade } from '#lib/score.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import { t, word as said } from '#lib/i18n.ts';
	import { loadLanguage, loadSpellLevel, saveLanguage, saveSpellLevel } from '#lib/storage.ts';
	import { PICTURES, WORD_PICTURES } from '#lib/paint.ts';
	import Icon from '#lib/Icon.svelte';
	import Pip from '#lib/Pip.svelte';
	import Reward from '#lib/Reward.svelte';
	import { awardSticker } from '#lib/stickers.ts';
	import { trackPlay } from '#lib/playlog.ts';

	const ROUND_WORDS = 5;
	const SLOW = 0.45; // extra slow: the child has to catch every sound
	const BREATHE_MS = 900; // small pause before the word is spoken, on start and between words
	const PROMPT: Record<Language, string> = {
		en: 'Hear a word, pick its spelling.',
		nl: 'Hoor een woord, kies hoe je het schrijft.'
	};
	const ALMOST: Record<Language, string> = { en: 'Almost!', nl: 'Bijna!' };

	let phase = $state<'start' | 'play' | 'reward'>('start');
	let language = $state<Language>('en');
	let level = $state(1);
	let word = $state('');
	let options = $state<string[]>([]);
	/** Wrong picks this word: greyed out, near misses in amber. */
	let crossed = $state<string[]>([]);
	let nearPicks = $state<string[]>([]);
	/** Similarity of each wrong pick this word; folds into the word's grade. */
	let wrongSims: number[] = [];
	let grades = $state<Grade[]>([]);
	let solved = $state(false);
	let wordsDone = $state(0);
	let newSticker = $state('');
	/** Little mode (3–5): real words get their picture next to the spelling. */
	let little = $state(false);
	let timer = 0;

	/** The picture for a real word (never for a sound-alike spelling), in Little mode only. */
	const pictureFor = (option: string) => {
		if (!little || !SPELL_WORDS[language].includes(option)) return undefined;
		const id = WORD_PICTURES[language][option.toLowerCase()];
		return id ? PICTURES.find((p) => p.id === id) : undefined;
	};

	onMount(() => {
		language = loadLanguage();
		level = loadSpellLevel();
		little = document.documentElement.dataset.mode === 'little';
		const stop = trackPlay('spell');
		return () => {
			stop();
			clearTimeout(timer);
			clearTimeout(speakTimer);
			stopSpeech();
		};
	});

	let speakTimer = 0;

	function nextWord() {
		word = pickSpellWord(language, level);
		options = choices(word, language, level);
		crossed = [];
		nearPicks = [];
		wrongSims = [];
		solved = false;
		clearTimeout(speakTimer);
		speakTimer = window.setTimeout(() => speak(said(word), language, undefined, SLOW), BREATHE_MS);
	}

	function play() {
		wordsDone = 0;
		grades = [];
		phase = 'play';
		unlockSpeech(); // the word itself is spoken after a pause, outside the gesture
		nextWord();
	}

	function pick(option: string) {
		if (solved || crossed.includes(option)) return;
		clearTimeout(speakTimer); // a pick answers the word: don't speak it over the feedback
		if (option === word) {
			solved = true;
			wordsDone++;
			grades = [...grades, gradeAttempts(wrongSims)];
			sfx.chime();
			speak([said(word), t(language, 'praise')], language, undefined, SLOW);
			clearTimeout(timer);
			timer = window.setTimeout(() => {
				if (wordsDone >= ROUND_WORDS) finishRound();
				else nextWord();
			}, 1800);
		} else {
			const sim = similarity(option, word, language);
			wrongSims.push(sim);
			crossed = [...crossed, option];
			if (sim >= NEAR) {
				// Sounds right, spelled differently: encourage, then repeat the word.
				nearPicks = [...nearPicks, option];
				sfx.tok();
				speak([t(language, 'almost'), said(word)], language, undefined, SLOW);
			} else {
				sfx.bloop();
				speak(said(word), language, undefined, SLOW);
			}
		}
	}

	/** Four or more first-try words: the next round is one level harder. */
	function finishRound() {
		newSticker = awardSticker();
		phase = 'reward';
		if (grades.filter((g) => g === 'gold').length >= 4 && level < SPELL_LEVELS) {
			level++;
			saveSpellLevel(level);
		}
	}
</script>

<main>
	<div class="corner left">
		{#if phase === 'start'}
			<a class="icon" href={resolve('/home')} aria-label="All games"><Icon name="home" size={34} /></a>
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={() => { clearTimeout(timer); clearTimeout(speakTimer); stopSpeech(); phase = 'start'; }}><Icon name="home" size={34} /></button>
		{/if}
	</div>

	{#if phase === 'start'}
		<section class="stage">
			<Pip {language} line={PROMPT[language]} />
			<button type="button" class="big-btn play" aria-label="Play" onclick={play}><Icon name="play" size={72} /></button>
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
				{#each Array.from({ length: SPELL_LEVELS }, (_, i) => i + 1) as l (l)}
					<button
						type="button"
						class="lvl"
						aria-label="Level {l}"
						aria-pressed={level === l}
						onclick={() => {
							level = l;
							saveSpellLevel(l);
						}}>{l}</button
					>
				{/each}
			</div>
		</section>
	{:else if phase === 'play'}
		<ol class="dots" aria-label="{wordsDone} of {ROUND_WORDS}">
			{#each Array.from({ length: ROUND_WORDS }, (_, i) => i) as i (i)}
				<li class={grades[i]}>{grades[i] ? '★' : ''}</li>
			{/each}
		</ol>
		<section class="stage">
			<!-- No bubble: the word in writing would give the spelling away. Tapping Pip says it again. -->
			<div class="pip-quiet"><Pip {language} size={92} line={said(word)} /></div>
			<div class="options" role="group" aria-label="Pick the right spelling">
				{#key word}
					{#each options as option (option)}
						{@const picture = pictureFor(option)}
						<button
							type="button"
							class="option"
							class:right={solved && option === word}
							class:near={nearPicks.includes(option)}
							class:wrong={crossed.includes(option)}
							disabled={solved || crossed.includes(option)}
							onclick={() => pick(option)}
						>
							{#if picture}
								<svg class="word-pic" viewBox="-4 -4 108 108" aria-hidden="true">
									<path d={picture.d} fill="none" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />
								</svg>
							{/if}
							<span class="word">{option.toLowerCase()}</span>
							{#if nearPicks.includes(option)}<span class="almost">{ALMOST[language]}</span>{/if}
						</button>
					{/each}
				{/key}
			</div>
		</section>
	{:else}
		<section class="stage">
			<Reward {grades} sticker={newSticker} {language} onAgain={play} />
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
		gap: clamp(1.5rem, 5vh, 3rem);
		width: 100%;
	}
	.corner {
		position: absolute;
		top: 1rem;
		left: 1rem;
	}

	/* Keycaps: 4 px ink line, 6 px solid shadow that presses down. */
	.icon,
	.big-btn,
	.flag,
	.lvl,
	.option {
		border: var(--line) solid var(--ink);
		background: var(--white);
		box-shadow: 0 6px 0 var(--ink);
		color: inherit;
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.big-btn:active,
	.flag:active,
	.lvl:active,
	.option:enabled:active {
		transform: translateY(6px);
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		min-width: var(--tap);
		min-height: var(--tap);
		border-radius: 50%;
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
	}
	.pip-quiet :global(.bubble) {
		display: none;
	}
	.flags {
		display: flex;
		gap: 2rem;
	}
	.flag {
		min-width: max(5.5rem, var(--tap));
		min-height: max(5.5rem, var(--tap));
		border-radius: 50%;
		display: grid;
		place-items: center;
	}
	.flag[aria-pressed='true'],
	.lvl[aria-pressed='true'] {
		box-shadow: 0 6px 0 var(--ink), 0 0 0 6px var(--ink);
	}
	.levels {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}
	.lvl {
		min-width: var(--tap);
		min-height: var(--tap);
		border-radius: 50%;
		font: inherit;
		font-size: 1.7rem;
		font-weight: 700;
	}

	.dots {
		position: absolute;
		top: 1.4rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 0.6rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.dots li {
		width: clamp(1.6rem, 6vw, 2.4rem);
		height: clamp(1.6rem, 6vw, 2.4rem);
		border: 3px solid var(--ink);
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: clamp(1rem, 3.8vw, 1.5rem);
		line-height: 1;
	}
	/* Grade colors: gold (first try), silver (one near miss), bronze (kept trying). */
	.dots li.gold {
		background: var(--sun);
	}
	.dots li.silver {
		background: var(--silver);
	}
	.dots li.bronze {
		background: var(--bronze);
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: clamp(0.8rem, 2.5vh, 1.4rem);
		width: min(26rem, 94vw);
	}
	.option {
		display: flex;
		align-items: center;
		gap: 1.4rem;
		text-align: left;
		min-height: var(--tap);
		padding: clamp(0.7rem, 2.2vh, 1.1rem) 1rem;
		border-radius: 20px;
		font-family: inherit;
		font-size: clamp(2.2rem, 9vw, 3.4rem);
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0.06em;
		animation: drop 260ms cubic-bezier(0.3, 1.4, 0.6, 1) backwards;
	}
	.word-pic {
		flex: none;
		width: 84px;
		height: 84px;
	}
	.almost {
		margin-left: auto;
		font-family: var(--title);
		font-size: 1.3rem;
		letter-spacing: 0;
	}
	.option:nth-child(2) {
		animation-delay: 90ms;
	}
	.option:nth-child(3) {
		animation-delay: 180ms;
	}
	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-0.8rem) scale(0.9);
		}
	}
	.option.right {
		background: var(--leaf);
		color: var(--paper);
		animation: cheer 400ms ease-in-out;
	}
	.option.right .word-pic path {
		stroke: var(--paper);
	}
	@keyframes cheer {
		30% {
			transform: scale(1.08);
		}
	}
	.option.wrong {
		background: #eee;
		color: #9a9a9a;
	}
	.option.wrong .word {
		text-decoration: line-through;
		text-decoration-thickness: 4px;
	}
	/* A near miss sounded right: warm amber, no strike-through shaming. */
	.option.near {
		background: #ffe2a8;
		color: #8a6d1a;
	}
	.option.near .word {
		text-decoration: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.option {
			animation: none;
		}
	}
</style>
