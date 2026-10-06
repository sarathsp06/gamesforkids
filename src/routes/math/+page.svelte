<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { sfx } from '#lib/audio.ts';
	import { loadMath, saveMath, type MathProgress } from '#lib/storage.ts';
	import {
		LEVELS, PASS_MS, PASS_SETS, QUESTIONS_PER_SET, SETS_PER_LEVEL,
		isUnlocked, passedSets, questionnaire, type Question
	} from '#lib/math.ts';

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
	let startedAt = 0;
	let now = $state(0);
	let finishMs = $state(0);
	let previousBest = $state<number | undefined>(undefined);
	let tick = 0;

	onMount(() => {
		progress = loadMath();
		return () => clearInterval(tick);
	});

	const elapsed = $derived(screen === 'done' ? finishMs : Math.max(0, now - startedAt));
	const seconds = (ms: number) => (ms / 1000).toFixed(1);
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
		startedAt = now = performance.now();
		clearInterval(tick);
		tick = window.setInterval(() => (now = performance.now()), 100);
		screen = 'play';
	}

	function finish() {
		clearInterval(tick);
		finishMs = Math.round(performance.now() - startedAt);
		previousBest = best(level, set);
		if (previousBest === undefined || finishMs < previousBest) {
			progress = { v: 1, best: { ...progress.best, [`${level}-${set}`]: finishMs } };
			saveMath(progress);
		}
		sfx.chime();
		screen = 'done';
	}

	function submit() {
		if (!input) return;
		if (Number(input) === questions[index].answer) {
			sfx.tok();
			input = '';
			if (++index === questions.length) finish();
		} else {
			sfx.bloop();
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

<main>
	<div class="corner">
		{#if screen === 'levels'}
			<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>
		{:else}
			<button
				type="button"
				class="icon"
				aria-label="Back"
				onclick={() => {
					clearInterval(tick);
					screen = screen === 'sets' ? 'levels' : 'sets';
				}}>‹</button
			>
		{/if}
	</div>

	{#if screen === 'levels'}
		<ol class="levels" aria-label="Levels">
			{#each LEVELS as l, i (i)}
				{@const open = isUnlocked(progress.best, i)}
				{@const passed = passedSets(progress.best, i)}
				<li>
					<button type="button" class="level" class:open disabled={!open} onclick={() => openLevel(i)} aria-label="Level {i + 1}{open ? '' : ', locked'}">
						<span class="num">{i + 1}</span>
						<span class="example">{open ? l.example : '🔒'}</span>
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
	{:else if screen === 'sets'}
		<section class="stage">
			<h1 class="title"><span class="num">{level + 1}</span> {LEVELS[level].example}</h1>
			<ol class="sets" aria-label="Questionnaires">
				{#each Array.from({ length: SETS_PER_LEVEL }, (_, s) => s) as s (s)}
					{@const ms = best(level, s)}
					<li>
						<button type="button" class="set" class:passed={ms !== undefined && ms <= PASS_MS} onclick={() => start(s)}>
							<span class="set-num">{s + 1}</span>
							<span class="time">{ms === undefined ? '▶' : `⏱ ${seconds(ms)}`}</span>
						</button>
					</li>
				{/each}
			</ol>
		</section>
	{:else if screen === 'play'}
		<section class="stage">
			<div class="clock" class:late={elapsed > PASS_MS} role="timer" aria-label="{Math.floor(elapsed / 1000)} seconds">
				<span class="bar" style="--p: {Math.min(1, elapsed / PASS_MS)}"></span>
				<span class="secs">⏱ {Math.floor(elapsed / 1000)}</span>
			</div>

			<ol class="dots" aria-label="{index} of {QUESTIONS_PER_SET}">
				{#each questions as _, i (i)}
					<li class:on={i < index} class:now={i === index}></li>
				{/each}
			</ol>

			{#key wrongFlash}
				<div class="question" class:wobble={wrongFlash > 0} aria-live="polite">
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
						onclick={() => press(key)}>{key}</button
					>
				{/each}
			</div>
		</section>
	{:else if screen === 'done'}
		{@const passed = finishMs <= PASS_MS}
		{@const record = previousBest === undefined || finishMs < previousBest}
		<section class="stage">
			<div class="result" class:passed>
				<span class="badge" aria-hidden="true">{passed ? '⭐' : '⏱'}</span>
				<span class="big-time">{seconds(finishMs)}</span>
			</div>
			<p class="facts">
				{#if record && previousBest !== undefined}<span class="pill sun">🏆 −{seconds(previousBest - finishMs)}</span>{/if}
				{#if !record}<span class="pill">🏆 {seconds(previousBest!)}</span>{/if}
				<span class="pill">✗ {mistakes}</span>
			</p>
			<span class="pips big" aria-label="{Math.min(passedSets(progress.best, level), PASS_SETS)} of {PASS_SETS} passed">
				{#each Array.from({ length: PASS_SETS }, (_, p) => p) as p (p)}
					<i class:on={p < passedSets(progress.best, level)}></i>
				{/each}
			</span>
			<div class="actions">
				<button type="button" class="action play" aria-label="Try again" onclick={() => start(set)}>↻</button>
				{#if set + 1 < SETS_PER_LEVEL}
					<button type="button" class="action" aria-label="Next questionnaire" onclick={() => start(set + 1)}>▶</button>
				{/if}
				{#if level + 1 < LEVELS.length && isUnlocked(progress.best, level + 1)}
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
		border: var(--line) solid var(--ink);
		background: var(--paper);
		box-shadow: 0 var(--line) 0 var(--ink);
		color: inherit;
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.level:active,
	.set:active,
	.pad-key:active,
	.action:active {
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
	.pips.big i {
		width: 1.6rem;
		height: 1.6rem;
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
		grid-template-columns: repeat(3, clamp(4rem, 15vw, 5.5rem));
		gap: 0.7rem;
	}
	.pad-key {
		height: clamp(4rem, 13vw, 5rem);
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
		background: #eee;
	}

	.result {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 2rem;
		border: var(--line) solid var(--ink);
		border-radius: 28px;
		box-shadow: 0 8px 0 var(--ink);
		animation: pop 300ms cubic-bezier(0.3, 1.6, 0.6, 1);
	}
	.result.passed {
		background: var(--sun);
	}
	.badge {
		font-size: clamp(3rem, 10vw, 5rem);
		line-height: 1;
	}
	.big-time {
		font-size: clamp(4rem, 15vw, 8rem);
		font-weight: 700;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}
	@keyframes pop {
		from {
			transform: scale(0.6);
		}
	}
	.facts {
		display: flex;
		gap: 0.8rem;
		margin: 0;
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
		width: clamp(5.5rem, 18vw, 7rem);
		height: clamp(5.5rem, 18vw, 7rem);
		border-radius: 22px;
		font-size: 3rem;
		font-weight: 700;
		line-height: 1;
	}
	.action.play {
		background: var(--sun);
	}
	.action.next-level {
		background: var(--ink);
		color: var(--paper);
	}
</style>
