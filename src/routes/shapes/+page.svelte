<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { speak, stopSpeech, sfx, unlockSpeech } from '#lib/audio.ts';
	import { SHAPE_LEVELS, question, type Kind, type Option, type Question, type Shape } from '#lib/shapes.ts';
	import { NEAR, gradeAttempts, type Grade } from '#lib/score.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import { t, type Line } from '#lib/i18n.ts';
	import { loadLanguage, loadShapeLevel, saveLanguage, saveShapeLevel } from '#lib/storage.ts';
	import Icon from '#lib/Icon.svelte';
	import Pip from '#lib/Pip.svelte';
	import Reward from '#lib/Reward.svelte';
	import { awardSticker } from '#lib/stickers.ts';
	import { trackPlay } from '#lib/playlog.ts';

	const ROUND = 5;
	const BREATHE_MS = 900; // small pause before the prompt, on start and between questions
	const PROMPT: Record<Language, string> = { en: 'Find the shape I say.', nl: 'Zoek de vorm die ik zeg.' };
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
	let newSticker = $state('');
	let timer = 0;
	let speakTimer = 0;

	onMount(() => {
		language = loadLanguage();
		level = loadShapeLevel();
		const stop = trackPlay('shapes');
		return () => {
			stop();
			clearTimeout(timer);
			clearTimeout(speakTimer);
			stopSpeech();
		};
	});

	const prompt = (): Line =>
		q!.ask === 'find'
			? t(language, `shapes.find.${q!.kind}`)
			: q!.ask === 'count'
				? t(language, `shapes.howMany.${q!.kind as 'circle' | 'triangle'}`)
				: t(language, q!.ask === 'odd' ? 'shapes.odd' : 'shapes.next');

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
			const praise = t(language, 'praise');
			const fact = q!.ask === 'find' ? [t(language, `shapes.fact.${q!.kind}`)] : q!.ask === 'count' ? [t(language, 'count', o.n!)] : [];
			speak([praise, ...fact], language, go);
			clearTimeout(timer);
			timer = window.setTimeout(go, 12000);
		} else {
			wrongSims.push(o.sim);
			crossed = [...crossed, o.id];
			if (o.sim >= NEAR) {
				nearPicks = [...nearPicks, o.id];
				sfx.tok();
				speak(t(language, `shapes.almost.${q!.ask === 'next' || q!.ask === 'count' ? q!.ask : 'find'}`), language);
			} else {
				sfx.bloop();
				speak(prompt(), language);
			}
		}
	}

	/** Four or more first-try answers: the next round is one level harder. */
	function finish() {
		newSticker = awardSticker();
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
			<Pip {language} size={92} line={prompt()} />
			{#if q.row.length}
				<div class="row" aria-label="Pattern">
					{#each q.row as s, i (i)}<span class="cell">{@render pic(s)}</span>{/each}
					<span class="cell slot">?</span>
				</div>
			{/if}
			{#if q.picture.length}
				<svg class="picture" viewBox="0 0 100 100" aria-label="Picture">
					{#each q.picture as p (p.shape.id)}
						<path
							d={p.shape.d}
							transform="translate({p.x - 50} {p.y - 50})"
							fill={p.shape.color}
							fill-opacity="0.8"
							stroke="var(--ink)"
							stroke-width="2.5"
							stroke-linejoin="round"
						/>
					{/each}
				</svg>
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
						aria-label={o.n !== undefined ? String(o.n) : o.kind}
						onclick={() => pick(o)}>{#if o.n !== undefined}<span class="num">{o.n}</span>{:else}{@render pic(o)}{/if}</button
					>
				{/each}
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
		background: var(--blush);
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
		min-width: max(5.5rem, var(--tap));
		min-height: max(5.5rem, var(--tap));
		border-radius: 50%;
		display: grid;
		place-items: center;
	}
	.lvl {
		min-width: var(--tap);
		min-height: var(--tap);
		border-radius: 50%;
		font: inherit;
		font-size: 1.7rem;
		font-weight: 700;
	}
	.flag[aria-pressed='true'],
	.lvl[aria-pressed='true'] {
		box-shadow: 0 6px 0 var(--ink), 0 0 0 6px var(--ink);
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
	.dots li.gold {
		background: var(--sun);
	}
	.dots li.silver {
		background: var(--silver);
	}
	.dots li.bronze {
		background: var(--bronze);
	}

	.picture {
		width: min(22rem, 80vw, 42vh);
		height: auto;
		border: var(--line) solid var(--ink);
		border-radius: 20px;
		background: var(--paper);
	}
	.option:has(.num) {
		aspect-ratio: auto;
		padding: clamp(0.6rem, 2vh, 1rem) 0;
	}
	.num {
		font-size: clamp(2.6rem, 10vw, 4rem);
		font-weight: 700;
		line-height: 1;
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
		min-width: var(--tap);
		min-height: var(--tap);
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

	@media (prefers-reduced-motion: reduce) {
		.option {
			animation: none;
		}
	}
</style>
