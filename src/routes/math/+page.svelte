<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { sfx } from '#lib/audio.ts';
	import { NEAR, gradeAttempts, numberSimilarity, type Grade } from '#lib/score.ts';
	import { loadLanguage, loadMath, loadSettings, saveMath, type MathProgress } from '#lib/storage.ts';
	import { t } from '#lib/i18n.ts';
	import { awardSticker } from '#lib/stickers.ts';
	import { trackPlay } from '#lib/playlog.ts';
	import type { Language } from '#lib/words.ts';
	import Icon from '#lib/Icon.svelte';
	import Pip from '#lib/Pip.svelte';
	import Reward from '#lib/Reward.svelte';
	import {
		LEVELS, PASS_MS, PASS_SETS, QUESTIONS_PER_SET, SETS_PER_LEVEL,
		counts, isUnlocked, passedSets, questionnaire, type Question
	} from '#lib/math.ts';

	/** 0-based: levels 1–5 are exact-only; from level 6 a counting slip or swapped digits counts as "almost". */
	const NEAR_FROM_LEVEL = 5;

	type Screen = 'levels' | 'sets' | 'play' | 'done';

	let screen = $state<Screen>('levels');
	let progress = $state<MathProgress>({ v: 1, best: {} });
	let level = $state(0);
	let set = $state(0);
	let questions = $state<Question[]>([]);
	let index = $state(0);
	let input = $state('');
	let mistakes = $state(0);
	let wrongFlash = $state(0);
	/** Was the last miss close (off-by-one, swapped digits)? Warmer flash. */
	let nearMiss = $state(false);
	/** Grade per answered question: gold / silver / bronze. */
	let grades = $state<Grade[]>([]);
	let wrongSims: number[] = [];
	let startedAt = 0;
	let now = $state(0);
	let finishMs = $state(0);
	let previousBest = $state<number | undefined>(undefined);
	let tick = 0;
	let language = $state<Language>('en');
	/** The clock is on unless a grown-up turned it off: a round under a minute fills a star (design board 10). */
	let clock = $state(true);
	/** Stars this level had before the round just played, to tell the child what changed. */
	let starsBefore = $state(0);
	let newSticker = $state('');

	onMount(() => {
		progress = loadMath();
		language = loadLanguage();
		clock = loadSettings().clock;
		const stop = trackPlay('math');
		return () => {
			clearInterval(tick);
			stop();
		};
	});

	const intro = $derived(language === 'nl' ? 'Tien sommen. Klaar?' : 'Ten sums. Ready?');

	const elapsed = $derived(screen === 'done' ? finishMs : Math.max(0, now - startedAt));
	/** 42.3 under a minute, 1:14 over it. */
	const seconds = (ms: number) =>
		ms < 60_000 ? (ms / 1000).toFixed(1) : `${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, '0')}`;
	const best = (l: number, s: number): number | undefined => progress.best[`${l}-${s}`];

	function openLevel(l: number) {
		level = l;
		screen = 'sets';
	}

	function start(s: number) {
		set = s;
		questions = questionnaire(level, s);
		index = 0;
		input = '';
		mistakes = 0;
		wrongFlash = 0;
		nearMiss = false;
		grades = [];
		wrongSims = [];
		startedAt = now = performance.now();
		clearInterval(tick);
		tick = window.setInterval(() => (now = performance.now()), 100);
		screen = 'play';
	}

	function finish() {
		clearInterval(tick);
		finishMs = Math.round(performance.now() - startedAt);
		previousBest = best(level, set);
		starsBefore = passedSets(progress.best, level, clock);
		if (previousBest === undefined || finishMs < previousBest) {
			progress = { v: 1, best: { ...progress.best, [`${level}-${set}`]: finishMs } };
			saveMath(progress);
		}
		newSticker = awardSticker(); // the Reward screen plays the chime
		screen = 'done';
	}

	function submit() {
		if (!input) return;
		if (Number(input) === questions[index].answer) {
			sfx.tok();
			grades = [...grades, gradeAttempts(wrongSims)];
			wrongSims = [];
			input = '';
			if (++index === questions.length) finish();
		} else {
			// Levels 1–5 are plain right/wrong; "almost" (counting slip, swapped digits) starts at level 6.
			const sim = level >= NEAR_FROM_LEVEL ? numberSimilarity(Number(input), questions[index].answer) : 0;
			wrongSims.push(sim);
			nearMiss = sim >= NEAR;
			if (nearMiss) sfx.tok();
			else sfx.bloop();
			mistakes++;
			wrongFlash++;
			input = '';
		}
	}

	function press(key: string) {
		if (screen !== 'play') return;
		if (key === '⌫') input = input.slice(0, -1);
		else if (key === '✓') submit();
		else if (input.length < 4) input += key;
	}

	function onkeydown(e: KeyboardEvent) {
		if (screen !== 'play' || e.ctrlKey || e.metaKey || e.altKey) return;
		const key = /^[0-9]$/.test(e.key) ? e.key : e.key === 'Backspace' ? '⌫' : e.key === 'Enter' ? '✓' : '';
		if (!key) return;
		e.preventDefault();
		press(key);
	}

	const PAD = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '⌫', '0', '✓'];
</script>

<svelte:window {onkeydown} />

{#snippet goal(stars: number)}
	<!-- The rule, where the child sees it (design board 10): a clock with 60, three stars, the next level's lock. -->
	<div class="goal" aria-label="{Math.min(stars, PASS_SETS)} of {PASS_SETS} stars{clock ? ', each a round under a minute' : ''}">
		{#if clock}<span class="sixty"><Icon name="timer" size={30} />60</span><span class="sep"></span>{/if}
		<span class="stars">
			{#each Array.from({ length: PASS_SETS }, (_, p) => p) as p (p)}<span class="star" class:on={p < stars}>{#if p < stars}<Icon name="star" size={16} />{/if}</span>{/each}
		</span>
		{#if level + 1 < LEVELS.length}
			<span class="arrow" aria-hidden="true">→</span>
			<span class="next" class:open={stars >= PASS_SETS}>{#if stars >= PASS_SETS}{level + 2}{:else}<Icon name="lock" size={26} />{/if}</span>
		{/if}
	</div>
{/snippet}

<main>
	<div class="corner">
		{#if screen === 'levels'}
			<a class="icon" href={resolve('/home')} aria-label="All games"><Icon name="home" size={30} /></a>
		{:else}
			<button
				type="button"
				class="icon"
				aria-label="Back"
				onclick={() => {
					clearInterval(tick);
					screen = screen === 'sets' ? 'levels' : 'sets';
				}}><Icon name="back" size={34} /></button
			>
		{/if}
	</div>

	{#if screen === 'levels'}
		<section class="stage">
		<Pip {language} line={intro} />
		<ol class="levels" aria-label="Levels">
			{#each LEVELS as l, i (i)}
				{@const open = isUnlocked(progress.best, i, clock)}
				{@const passed = passedSets(progress.best, i, clock)}
				<li>
					<button type="button" class="level" class:open disabled={!open} onclick={() => openLevel(i)} aria-label="Level {i + 1}{open ? '' : ', locked'}">
						<span class="num">{i + 1}</span>
						<span class="example">{#if open}{l.example}{:else}<Icon name="lock" size={30} />{/if}</span>
						{#if open}
							<span class="pips" aria-label="{Math.min(passed, PASS_SETS)} of {PASS_SETS} passed">
								{#each Array.from({ length: PASS_SETS }, (_, p) => p) as p (p)}
									<i class:on={p < passed}></i>
								{/each}
							</span>
						{/if}
					</button>
				</li>
			{/each}
		</ol>
		</section>
	{:else if screen === 'sets'}
		<section class="stage">
			<h1 class="title"><span class="num">{level + 1}</span> {LEVELS[level].example}</h1>
			{@render goal(passedSets(progress.best, level, clock))}
			<ol class="sets" aria-label="Questionnaires">
				{#each Array.from({ length: SETS_PER_LEVEL }, (_, s) => s) as s (s)}
					{@const ms = best(level, s)}
					<li>
						<button type="button" class="set" class:passed={counts(ms, clock)} onclick={() => start(s)}>
							<span class="set-num">{s + 1}</span>
							<!-- Played but over a minute: its time in grey, played and not yet a star. -->
							<span class="time" class:slow={!counts(ms, clock)}>{#if clock && ms !== undefined}{seconds(ms)}{:else}<Icon name="play" size={22} />{/if}</span>
						</button>
					</li>
				{/each}
			</ol>
		</section>
	{:else if screen === 'play'}
		<section class="stage">
			{#if clock}
				<div class="clock" class:late={elapsed > PASS_MS} role="timer" aria-label="{Math.floor(elapsed / 1000)} seconds">
					<span class="bar" style="--p: {Math.min(1, elapsed / PASS_MS)}"></span>
					<span class="secs">{Math.floor(elapsed / 1000)}</span>
				</div>
			{/if}

			<ol class="dots" aria-label="{index} of {QUESTIONS_PER_SET}">
				{#each questions as _, i (i)}
					<li class={grades[i]} class:on={i < index} class:now={i === index}></li>
				{/each}
			</ol>

			{#key wrongFlash}
				<div class="question" class:wobble={wrongFlash > 0} class:near={nearMiss} aria-live="polite">
					<span>{questions[index].text} =</span>
					<output class="answer" class:empty={!input}>{input || '?'}</output>
				</div>
			{/key}

			<div class="pad" role="group" aria-label="Number pad">
				{#each PAD as key (key)}
					<button
						type="button"
						class="pad-key"
						class:ok={key === '✓'}
						class:del={key === '⌫'}
						aria-label={key === '⌫' ? 'Delete' : key === '✓' ? 'Check' : key}
						onclick={() => press(key)}
						>{#if key === '⌫'}<Icon name="undo" size={34} />{:else if key === '✓'}<Icon name="check" size={38} />{:else}{key}{/if}</button
					>
				{/each}
			</div>
		</section>
	{:else if screen === 'done'}
		{@const passed = finishMs <= PASS_MS}
		{@const record = previousBest === undefined || finishMs < previousBest}
		{@const starsNow = passedSets(progress.best, level, clock)}
		{@const news = starsNow >= PASS_SETS && starsBefore < PASS_SETS && level + 1 < LEVELS.length ? 'dash.level' : starsNow > starsBefore ? (clock ? 'dash.star' : 'dash.starFree') : clock && !passed ? 'dash.slow' : null}
		{@const nextSet = Array.from({ length: SETS_PER_LEVEL }, (_, k) => (set + 1 + k) % SETS_PER_LEVEL).find((s) => best(level, s) === undefined) ?? (set + 1) % SETS_PER_LEVEL}
		<section class="stage">
			<div class="done-top">
				{#if clock}
					<div class="result" class:passed>
						<span class="badge" aria-hidden="true"><Icon name={passed ? 'star' : 'retry'} size="1em" /></span>
						<span class="big-time">{seconds(finishMs)}</span>
						{#if record && previousBest !== undefined}<span class="pill sun">−{seconds(previousBest - finishMs)}</span>{/if}
						{#if !record}<span class="pill">{seconds(previousBest!)}</span>{/if}
					</div>
				{/if}
				{@render goal(starsNow)}
			</div>
			<Reward {grades} sticker={newSticker} {language} onAgain={() => start(set)} say={news ? t(language, news) : undefined} />
			<div class="actions">
				<button type="button" class="action" aria-label="Next questionnaire" onclick={() => start(nextSet)}><span class="set-num">{nextSet + 1}</span></button>
				{#if level + 1 < LEVELS.length && isUnlocked(progress.best, level + 1, clock)}
					<button type="button" class="action next-level" aria-label="Next level" onclick={() => openLevel(level + 1)}>{level + 2}</button>
				{/if}
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
		background: var(--sky);
	}
	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1.25rem, 3.5vh, 2.25rem);
		width: 100%;
	}
	.corner {
		position: absolute;
		top: 1rem;
		left: 1rem;
	}
	.icon,
	.level,
	.set,
	.pad-key,
	.action {
		/* Keycap: 4 px ink line, 6 px solid shadow that presses down; never smaller than a thumb. */
		min-width: var(--tap);
		min-height: var(--tap);
		border: var(--line) solid var(--ink);
		background: var(--white);
		box-shadow: 0 6px 0 var(--ink);
		color: var(--ink);
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.level:active,
	.set:active,
	.pad-key:active,
	.action:active {
		transform: translateY(6px);
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		width: var(--tap);
		height: var(--tap);
		border-radius: 50%;
		font-size: 1.9rem;
		line-height: 1;
		display: grid;
		place-items: center;
	}

	.levels,
	.sets,
	.dots {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.levels {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
		gap: 1.25rem;
		width: min(60rem, 100%);
	}
	.level {
		width: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.9rem 0.5rem 1rem;
		border-radius: 20px;
		opacity: 0.4;
		cursor: default;
	}
	.level.open {
		opacity: 1;
		cursor: pointer;
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border-radius: 50%;
		background: var(--ink);
		color: var(--paper);
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1;
	}
	.example {
		font-size: 1.9rem;
		font-weight: 700;
		white-space: nowrap;
	}
	.pips {
		display: flex;
		gap: 0.35rem;
	}
	.pips i {
		width: 0.9rem;
		height: 0.9rem;
		border: 3px solid var(--ink);
		border-radius: 50%;
	}
	.pips i.on {
		background: var(--sun);
	}

	.title {
		margin: 0;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		font-size: clamp(2rem, 6vw, 3rem);
	}
	.title .num {
		width: 3.4rem;
		height: 3.4rem;
		font-size: 2rem;
	}
	.sets {
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		gap: 1rem;
		width: min(48rem, 100%);
	}
	@media (max-width: 40rem) {
		.sets {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	.set {
		width: 100%;
		aspect-ratio: 1;
		border-radius: 18px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
	}
	.set.passed {
		background: var(--leaf);
		color: var(--paper);
	}
	.set-num {
		font-size: 2.4rem;
		font-weight: 700;
		line-height: 1;
	}
	.time {
		display: grid;
		place-items: center;
		min-height: 1.5rem;
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
	}

	.clock {
		position: relative;
		width: min(28rem, 90vw);
		height: 3rem;
		border: var(--line) solid var(--ink);
		border-radius: 999px;
		overflow: hidden;
		display: grid;
		place-items: center;
	}
	/* Fills up over the 60 s target; turns red once it is over. */
	.bar {
		position: absolute;
		inset: 0;
		transform-origin: left;
		transform: scaleX(var(--p));
		background: var(--sun);
		transition: transform 100ms linear;
	}
	.clock.late .bar {
		background: var(--red);
	}
	.secs {
		position: relative;
		font-size: 1.6rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.dots {
		display: flex;
		gap: 0.45rem;
	}
	.dots li {
		width: 1.2rem;
		height: 1.2rem;
		border: 3px solid var(--ink);
		border-radius: 50%;
	}
	.dots li.on {
		background: var(--leaf);
	}
	.dots li.now {
		background: var(--sun);
	}
	/* Question grades: silver = one near miss, bronze = kept trying. */
	.dots li.silver {
		background: var(--silver);
	}
	.dots li.bronze {
		background: var(--bronze);
	}

	.question {
		display: flex;
		align-items: center;
		gap: 0.25em;
		font-size: clamp(3.2rem, 11vw, 6.5rem);
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.answer {
		min-width: 1.6em;
		padding: 0.08em 0.2em;
		border: var(--line) solid var(--ink);
		border-radius: 16px;
		box-shadow: 0 var(--line) 0 var(--ink);
		text-align: center;
		background: var(--sun);
	}
	.answer.empty {
		background: var(--paper);
		color: #b5b5b5;
	}
	.wobble .answer {
		animation: wobble 300ms ease-in-out;
	}
	/* A near miss (off-by-one, swapped digits) wobbles warm amber, not red. */
	.near.wobble .answer {
		animation-name: wobble-near;
	}
	@keyframes wobble-near {
		25% {
			transform: rotate(-6deg);
			background: #ffe2a8;
		}
		75% {
			transform: rotate(6deg);
			background: #ffe2a8;
		}
	}
	@keyframes wobble {
		25% {
			transform: rotate(-6deg);
			background: var(--red);
		}
		75% {
			transform: rotate(6deg);
			background: var(--red);
		}
	}

	.pad {
		display: grid;
		grid-template-columns: repeat(3, max(var(--tap), clamp(4rem, 15vw, 5.5rem)));
		gap: 0.7rem;
	}
	.pad-key {
		display: grid;
		place-items: center;
		height: max(var(--tap), clamp(4rem, 13vw, 5rem));
		border-radius: 16px;
		font-size: 2.2rem;
		font-weight: 700;
		line-height: 1;
	}
	.pad-key.ok {
		background: var(--leaf);
		color: var(--paper);
	}
	.pad-key.del {
		background: var(--blush);
	}

	.result {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 2rem;
		border: var(--line) solid var(--ink);
		border-radius: 28px;
		background: var(--white);
		box-shadow: 0 6px 0 var(--ink);
		animation: pop 300ms cubic-bezier(0.3, 1.6, 0.6, 1);
	}
	.result.passed {
		background: var(--sun);
	}
	.badge {
		display: grid;
		font-size: clamp(2.5rem, 8vw, 4rem);
		line-height: 1;
	}
	.big-time {
		font-size: clamp(3rem, 11vw, 5.5rem);
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	@keyframes pop {
		from {
			transform: scale(0.6);
		}
	}
	.pill {
		padding: 0.3rem 0.9rem;
		border: 3px solid var(--ink);
		border-radius: 999px;
		font-size: 1.5rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.pill.sun {
		background: var(--sun);
	}
	.actions {
		display: flex;
		gap: 1.5rem;
	}
	.action {
		width: max(var(--tap), clamp(4.5rem, 14vw, 5.5rem));
		height: max(var(--tap), clamp(4.5rem, 14vw, 5.5rem));
		border-radius: 22px;
		font-size: 2.4rem;
		font-weight: 700;
		line-height: 1;
	}
	/* The next level, once three stars opened it: green like a passed set (design board 10b). */
	.action.next-level {
		background: var(--leaf);
		color: var(--white);
	}

	/* The round's time and the goal row side by side, so the next-level button stays on screen (board 10b). */
	.done-top {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 1.2rem 1.6rem;
	}
	.goal {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		padding: 0.55rem 1.1rem;
		border: var(--line) solid var(--ink);
		border-radius: 999px;
		background: var(--white);
		box-shadow: 0 5px 0 var(--ink);
	}
	.sixty {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-family: var(--title);
		font-size: 1.5rem;
		font-weight: 700;
	}
	.sep {
		width: 3px;
		height: 1.9rem;
		background: var(--ink);
		opacity: 0.25;
	}
	.stars {
		display: flex;
		gap: 0.4rem;
	}
	.star {
		width: 1.75rem;
		height: 1.75rem;
		display: grid;
		place-items: center;
		border: 3px solid var(--ink);
		border-radius: 50%;
		background: var(--white);
	}
	.star.on {
		background: var(--sun);
	}
	.arrow {
		font-family: var(--title);
		font-size: 1.6rem;
		font-weight: 700;
	}
	.next {
		width: 2.9rem;
		height: 2.9rem;
		display: grid;
		place-items: center;
		border: var(--line) solid var(--ink);
		border-radius: 14px;
		font-family: var(--title);
		font-size: 1.5rem;
		font-weight: 700;
	}
	.next.open {
		background: var(--leaf);
		color: var(--white);
	}
	.set:not(.passed) .time.slow {
		color: var(--mute);
	}
</style>
