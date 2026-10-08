<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { speak, stopSpeech, sfx, unlockSpeech } from '#lib/audio.ts';
	import { SHAPE_LEVELS, question, type Kind, type Option, type Question, type Shape } from '#lib/shapes.ts';
	import { NEAR, gradeAttempts, type Grade } from '#lib/score.ts';
	import { LANGUAGES, PRAISE, type Language } from '#lib/words.ts';
	import { loadLanguage, loadShapeLevel, saveLanguage, saveShapeLevel } from '#lib/storage.ts';

	const ROUND = 5;
	const BREATHE_MS = 900; // small pause before the prompt, on start and between questions
	const random = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
	const THE: Record<Language, Record<Kind, string>> = {
		en: { circle: 'the circle', triangle: 'the triangle', square: 'the square', rectangle: 'the rectangle' },
		nl: { circle: 'de cirkel', triangle: 'de driehoek', square: 'het vierkant', rectangle: 'de rechthoek' }
	};
	/** Said after a right "find" answer: the property that makes the shape what it is. */
	const FACT: Record<Language, Record<Kind, string>> = {
		en: {
			circle: 'A circle is round.',
			triangle: 'A triangle has three sides.',
			square: 'A square has four sides, all the same.',
			rectangle: 'A rectangle has two long sides and two short sides.'
		},
		nl: {
			circle: 'Een cirkel is rond.',
			triangle: 'Een driehoek heeft drie kanten.',
			square: 'Een vierkant heeft vier kanten, allemaal even lang.',
			rectangle: 'Een rechthoek heeft twee lange en twee korte kanten.'
		}
	};
	const ALMOST: Record<Language, Record<'find' | 'next', string>> = {
		en: { find: 'Almost! Look closely: straight sides, all joined up.', next: 'Almost! Look at the colour.' },
		nl: { find: 'Bijna! Kijk goed: rechte kanten, helemaal dicht.', next: 'Bijna! Kijk naar de kleur.' }
	};

	let phase = $state<'start' | 'play' | 'reward'>('start');
	let language = $state<Language>('en');
	let level = $state(1);
	let q = $state<Question>();
	let crossed = $state<string[]>([]);
	let nearPicks = $state<string[]>([]);
	let wrongSims: number[] = [];
	let grades = $state<Grade[]>([]);
	let solved = $state(false);
	let done = $state(0);
	let timer = 0;
	let speakTimer = 0;

	onMount(() => {
		language = loadLanguage();
		level = loadShapeLevel();
		return () => {
			clearTimeout(timer);
			clearTimeout(speakTimer);
			stopSpeech();
		};
	});

	const prompt = () =>
		q!.ask === 'find'
			? `${language === 'en' ? 'Find' : 'Zoek'} ${THE[language][q!.kind]}`
			: q!.ask === 'odd'
				? language === 'en' ? 'Which one is different?' : 'Welke is anders?'
				: language === 'en' ? 'What comes next?' : 'Wat komt hierna?';

	function next() {
		q = question(level);
		crossed = [];
		nearPicks = [];
		wrongSims = [];
		solved = false;
		clearTimeout(speakTimer);
		speakTimer = window.setTimeout(() => speak(prompt(), language), BREATHE_MS);
	}

	function play() {
		done = 0;
		grades = [];
		phase = 'play';
		unlockSpeech(); // the prompt is spoken after a pause, outside the gesture
		next();
	}

	function pick(o: Option) {
		if (solved || crossed.includes(o.id)) return;
		clearTimeout(speakTimer);
		if (o.sim === 1) {
			solved = true;
			done++;
			grades = [...grades, gradeAttempts(wrongSims)];
			sfx.chime();
			// Move on only after the praise and fact are fully spoken (fallback if TTS never reports the end).
			const current = q;
			const go = () => {
				if (phase !== 'play' || q !== current) return;
				clearTimeout(timer);
				timer = window.setTimeout(() => (done >= ROUND ? finish() : next()), 700);
			};
			speak(`${random(PRAISE[language])} ${q!.ask === 'find' ? FACT[language][q!.kind] : ''}`, language, go);
			clearTimeout(timer);
			timer = window.setTimeout(go, 12000);
		} else {
			wrongSims.push(o.sim);
			crossed = [...crossed, o.id];
			if (o.sim >= NEAR) {
				nearPicks = [...nearPicks, o.id];
				sfx.tok();
				speak(ALMOST[language][q!.ask === 'next' ? 'next' : 'find'], language);
			} else {
				sfx.bloop();
				speak(prompt(), language);
			}
		}
	}

	/** Four or more first-try answers: the next round is one level harder. */
	function finish() {
		phase = 'reward';
		if (grades.filter((g) => g === 'gold').length >= 4 && level < SHAPE_LEVELS) {
			level++;
			saveShapeLevel(level);
		}
	}
</script>

{#snippet pic(s: Shape)}
	<svg viewBox="0 0 100 100" aria-hidden="true">
		<path
			d={s.d}
			fill={s.closed ? s.color : 'none'}
			stroke="var(--ink)"
			stroke-width="5"
			stroke-linejoin="round"
			stroke-linecap="round"
		/>
	</svg>
{/snippet}

<main>
	<div class="corner left">
		{#if phase === 'start'}
			<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={() => { clearTimeout(timer); clearTimeout(speakTimer); stopSpeech(); phase = 'start'; }}>⌂</button>
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
			<div class="levels" role="group" aria-label="Level">
				{#each Array.from({ length: SHAPE_LEVELS }, (_, i) => i + 1) as l (l)}
					<button
						type="button"
						class="lvl"
						aria-label="Level {l}"
						aria-pressed={level === l}
						onclick={() => {
							level = l;
							saveShapeLevel(l);
						}}>{l}</button
					>
				{/each}
			</div>
		</section>
	{:else if phase === 'play' && q}
		<ol class="dots" aria-label="{done} of {ROUND}">
			{#each Array.from({ length: ROUND }, (_, i) => i) as i (i)}
				<li class={grades[i]}>{grades[i] ? '★' : ''}</li>
			{/each}
		</ol>
		<section class="stage">
			<button type="button" class="big-btn ear" aria-label="Hear it again" onclick={() => speak(prompt(), language)}>🔊</button>
			{#if q.row.length}
				<div class="row" aria-label="Pattern">
					{#each q.row as s, i (i)}<span class="cell">{@render pic(s)}</span>{/each}
					<span class="cell slot">?</span>
				</div>
			{/if}
			<div class="options" class:four={q.options.length === 4} role="group" aria-label="Pick a shape">
				{#each q.options as o (o.id)}
					<button
						type="button"
						class="option"
						class:right={solved && o.sim === 1}
						class:near={nearPicks.includes(o.id)}
						class:wrong={crossed.includes(o.id)}
						disabled={solved || crossed.includes(o.id)}
						aria-label={o.kind}
						onclick={() => pick(o)}>{@render pic(o)}</button
					>
				{/each}
			</div>
		</section>
	{:else}
		{@const golds = grades.filter((g) => g === 'gold').length}
		<section class="stage">
			<div class="trophy" aria-label="Round done">{golds === ROUND ? '🏆' : golds >= 3 ? '🥇' : '🥈'}</div>
			<div class="stars" aria-hidden="true">
				{#each grades as g, i (i)}
					<span class={g} style="--d: {i * 120}ms">★</span>
				{/each}
			</div>
			<button type="button" class="big-btn play" aria-label="Play level {level}" onclick={play}>▶</button>
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
		gap: clamp(1.2rem, 4vh, 2.5rem);
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
	.lvl:active,
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
		width: clamp(4.5rem, 14vw, 6rem);
		height: clamp(4.5rem, 14vw, 6rem);
		border-radius: 50%;
		font-size: clamp(2rem, 6vw, 2.8rem);
	}
	.flags,
	.levels {
		display: flex;
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

	.row {
		display: flex;
		gap: clamp(0.3rem, 1.5vw, 0.8rem);
	}
	.cell {
		width: clamp(3rem, 12vw, 5rem);
		aspect-ratio: 1;
		display: grid;
		place-items: center;
	}
	.slot {
		border: var(--line) dashed var(--ink);
		border-radius: 14px;
		font-size: clamp(1.8rem, 6vw, 2.8rem);
		font-weight: 700;
	}
	.options {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: clamp(0.8rem, 3vw, 1.5rem);
		width: min(36rem, 94vw);
	}
	.options.four {
		grid-template-columns: repeat(2, 1fr);
		width: min(26rem, 80vw);
	}
	.option {
		aspect-ratio: 1;
		padding: 0.6rem;
		border-radius: 20px;
		animation: drop 260ms cubic-bezier(0.3, 1.4, 0.6, 1) backwards;
	}
	svg {
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.option:nth-child(2) {
		animation-delay: 90ms;
	}
	.option:nth-child(3) {
		animation-delay: 180ms;
	}
	.option:nth-child(4) {
		animation-delay: 270ms;
	}
	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-0.8rem) scale(0.9);
		}
	}
	.option.right {
		background: var(--leaf);
		animation: cheer 400ms ease-in-out;
	}
	@keyframes cheer {
		30% {
			transform: scale(1.08);
		}
	}
	.option.wrong {
		background: #eee;
		opacity: 0.45;
	}
	/* A near miss: warm amber, still fully visible. */
	.option.near {
		background: #ffe2a8;
		opacity: 1;
	}

	.trophy {
		font-size: clamp(6rem, 24vw, 10rem);
		line-height: 1;
		animation: cheer 500ms ease-in-out;
	}
	.stars {
		display: flex;
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
		.option,
		.stars span,
		.trophy {
			animation: none;
		}
	}
</style>
