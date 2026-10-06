<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { speak, stopSpeech, sfx } from '#lib/audio.ts';
	import { choices, pickSpellWord } from '#lib/spell.ts';
	import { LANGUAGES, PRAISE, type Language } from '#lib/words.ts';
	import { loadLanguage, saveLanguage } from '#lib/storage.ts';

	const ROUND_WORDS = 5;
	const SLOW = 0.45; // extra slow: the child has to catch every sound
	const random = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

	let phase = $state<'start' | 'play' | 'reward'>('start');
	let language = $state<Language>('en');
	let word = $state('');
	let options = $state<string[]>([]);
	/** Wrong picks this word, greyed out. */
	let crossed = $state<string[]>([]);
	let solved = $state(false);
	let wordsDone = $state(0);
	let timer = 0;

	onMount(() => {
		language = loadLanguage();
		return () => {
			clearTimeout(timer);
			stopSpeech();
		};
	});

	function nextWord() {
		word = pickSpellWord(language);
		options = choices(word, language);
		crossed = [];
		solved = false;
		speak(word.toLowerCase(), language, undefined, SLOW);
	}

	function play() {
		wordsDone = 0;
		phase = 'play';
		nextWord();
	}

	function pick(option: string) {
		if (solved || crossed.includes(option)) return;
		if (option === word) {
			solved = true;
			wordsDone++;
			sfx.chime();
			speak(`${word.toLowerCase()}. ${random(PRAISE[language])}`, language, undefined, SLOW);
			clearTimeout(timer);
			timer = window.setTimeout(() => {
				if (wordsDone >= ROUND_WORDS) phase = 'reward';
				else nextWord();
			}, 1800);
		} else {
			crossed = [...crossed, option];
			sfx.bloop();
			speak(word.toLowerCase(), language, undefined, SLOW);
		}
	}
</script>

<main>
	<div class="corner left">
		{#if phase === 'start'}
			<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={() => { clearTimeout(timer); stopSpeech(); phase = 'start'; }}>⌂</button>
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
							speak(l.name, l.id);
						}}>{l.flag}</button
					>
				{/each}
			</div>
		</section>
	{:else if phase === 'play'}
		<ol class="dots" aria-label="{wordsDone} of {ROUND_WORDS}">
			{#each Array.from({ length: ROUND_WORDS }, (_, i) => i) as i (i)}
				<li class:on={i < wordsDone}>{i < wordsDone ? '★' : ''}</li>
			{/each}
		</ol>
		<section class="stage">
			<button type="button" class="big-btn ear" aria-label="Hear the word again" onclick={() => speak(word.toLowerCase(), language, undefined, SLOW)}>🔊</button>
			<div class="options" role="group" aria-label="Pick the right spelling">
				{#key word}
					{#each options as option (option)}
						<button
							type="button"
							class="option"
							class:right={solved && option === word}
							class:wrong={crossed.includes(option)}
							disabled={solved || crossed.includes(option)}
							onclick={() => pick(option)}>{option.toLowerCase()}</button
						>
					{/each}
				{/key}
			</div>
		</section>
	{:else}
		<section class="stage">
			<div class="trophy" aria-label="Round done">🏆</div>
			<div class="stars" aria-hidden="true">
				{#each Array.from({ length: ROUND_WORDS }, (_, i) => i) as i (i)}
					<span style="--d: {i * 120}ms">★</span>
				{/each}
			</div>
			<div class="actions">
				<button type="button" class="big-btn play" aria-label="Play again" onclick={play}>▶</button>
			</div>
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
		gap: clamp(1.5rem, 5vh, 3rem);
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
	.option {
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
	.option:enabled:active {
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
	.ear {
		width: clamp(5rem, 16vw, 6.5rem);
		height: clamp(5rem, 16vw, 6.5rem);
		border-radius: 50%;
		font-size: clamp(2.2rem, 7vw, 3rem);
	}
	.flags {
		display: flex;
		gap: 2rem;
	}
	.flag {
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		font-size: 2.4rem;
	}
	.flag[aria-pressed='true'] {
		box-shadow: 0 var(--line) 0 var(--ink), 0 0 0 6px var(--ink);
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
	.dots li.on {
		background: var(--sun);
	}

	.options {
		display: flex;
		flex-direction: column;
		gap: clamp(0.8rem, 2.5vh, 1.4rem);
		width: min(26rem, 94vw);
	}
	.option {
		padding: clamp(0.7rem, 2.2vh, 1.1rem) 1rem;
		border-radius: 20px;
		font-family: inherit;
		font-size: clamp(2.2rem, 9vw, 3.4rem);
		font-weight: 700;
		line-height: 1;
		letter-spacing: 0.06em;
		animation: drop 260ms cubic-bezier(0.3, 1.4, 0.6, 1) backwards;
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
	@keyframes cheer {
		30% {
			transform: scale(1.08);
		}
	}
	.option.wrong {
		background: #eee;
		color: #9a9a9a;
		text-decoration: line-through;
		text-decoration-thickness: 4px;
	}

	.trophy {
		font-size: clamp(6rem, 24vw, 10rem);
		line-height: 1;
		animation: cheer 500ms ease-in-out;
	}
	.stars {
		display: flex;
		gap: 0.6rem;
		font-size: 2.6rem;
		color: var(--sun);
		-webkit-text-stroke: 2px var(--ink);
	}
	.stars span {
		animation: drop 400ms cubic-bezier(0.3, 1.6, 0.6, 1) backwards;
		animation-delay: var(--d);
	}
	@media (prefers-reduced-motion: reduce) {
		.option,
		.stars span,
		.trophy {
			animation: none;
		}
	}
</style>
