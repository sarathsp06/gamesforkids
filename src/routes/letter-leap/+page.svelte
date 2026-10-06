{#snippet handCue(side: 'left' | 'right')}
	{@const on = !!target && hand(target) === side}
	{#key on && game.index}
		<div class="hand {side}" class:on aria-hidden="true"><span>✋</span></div>
	{/key}
{/snippet}

<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { game, ROUND_WORDS } from '#lib/game.svelte.ts';
	import { speak } from '#lib/audio.ts';
	import { KEY_ROWS, LANGUAGES, STICKERS, hand } from '#lib/words.ts';
	import Keycap from '#lib/Keycap.svelte';
	import ParentDialog from '#lib/ParentDialog.svelte';

	let parent: ParentDialog;
	let holding = $state(false);
	let holdTimer = 0;
	const HOLD_MS = 3000;

	onMount(() => game.load());

	const playing = $derived(['listening', 'typing', 'wordDone'].includes(game.phase));
	const target = $derived(game.phase === 'typing' ? game.word[game.index] : '');

	function startHold() {
		holding = true;
		holdTimer = window.setTimeout(() => {
			holding = false;
			parent.open();
		}, HOLD_MS);
	}
	function stopHold() {
		holding = false;
		clearTimeout(holdTimer);
	}

	function onkeydown(e: KeyboardEvent) {
		if (document.querySelector('dialog[open]') || (e.target as Element).closest?.('[data-own-keys]')) return;
		if (game.phase === 'start' || game.phase === 'reward') {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				game.play(); // inside the key gesture, so speech is allowed
			}
			return;
		}
		if (!playing) return;
		if (e.code === 'Space') {
			e.preventDefault();
			game.replay();
			return;
		}
		// Block browser shortcuts and find-as-you-type on letter/digit keys; only letters reach the game.
		if (/^(Key[A-Z]|Digit[0-9])$/.test(e.code)) {
			e.preventDefault();
			e.stopImmediatePropagation();
			if (!e.ctrlKey && !e.metaKey && !e.altKey) game.press(e.key);
		}
	}

	function capAnim(i: number) {
		if (game.phase === 'wordDone') return 'cheer';
		if (i === game.index - 1 && game.lastPress.ok) return 'press';
		if (i === game.index && !game.lastPress.ok) return 'wobble';
		return 'pop';
	}
</script>

<svelte:window onkeydowncapture={onkeydown} />

<main>
	{#if game.phase === 'start'}
		<div class="corner left">
			<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>
		</div>
		<div class="corner right">
			<button
				type="button"
				class="icon gear"
				class:holding
				aria-label="Parent settings (hold for 3 seconds)"
				data-own-keys
				onpointerdown={startHold}
				onpointerup={stopHold}
				onpointerleave={stopHold}
				onpointercancel={stopHold}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && startHold()}
				onkeyup={stopHold}
				oncontextmenu={(e) => e.preventDefault()}
			>
				<svg viewBox="0 0 40 40" aria-hidden="true">
					<circle class="ring" cx="20" cy="20" r="17" />
				</svg>
				<span>⚙</span>
			</button>
		</div>

		<section class="stage">
			<button type="button" class="key-btn play" aria-label="Play" onclick={() => game.play()}>▶</button>

			<div class="flags" role="group" aria-label="Language">
				{#each LANGUAGES as l (l.id)}
					<button
						type="button"
						class="flag"
						aria-label={l.name}
						aria-pressed={game.language === l.id}
						onclick={() => {
							game.setLanguage(l.id);
							speak(l.name, l.id);
						}}>{l.flag}</button
					>
				{/each}
			</div>

			<button type="button" class="book" aria-label="Sticker book" onclick={() => game.openStickers()}>
				<span aria-hidden="true">📒</span>
				{#key game.progress.stickers.length}<b class="count">{game.progress.stickers.length}</b>{/key}
			</button>
		</section>
	{:else if playing}
		<div class="corner left">
			<button type="button" class="icon" aria-label="Home" onclick={() => game.home()}>⌂</button>
		</div>
		<ol class="dots" aria-label="{game.roundWords} of {ROUND_WORDS}">
			{#each Array.from({ length: ROUND_WORDS }, (_, i) => i) as i (i)}
				<li class={game.grades[i]} class:on={i < game.roundWords}>{i < game.roundWords ? '★' : ''}</li>
			{/each}
		</ol>

		<section class="stage">
			<div class="word-row">
				{@render handCue('left')}
			{#key game.word + (game.phase === 'listening')}
				<div class="word" style="--n: {game.word.length}" aria-live="polite" aria-label={game.phase === 'listening' ? 'Listen' : game.word}>
					{#each game.word.split('') as letter, i (i)}
						{#key i >= game.index - 1 && i <= game.index ? game.lastPress.n : 0}
							<span style="--delay: {i * 60}ms; display: contents">
								<Keycap
									{letter}
									hand={hand(letter)}
									state={game.phase === 'listening' ? 'blank' : i < game.index ? 'done' : i === game.index ? 'next' : 'idle'}
									anim={game.phase === 'listening' ? '' : capAnim(i)}
								/>
							</span>
						{/key}
					{/each}
				</div>
			{/key}
				{@render handCue('right')}
			</div>

			<button
				type="button"
				class="key-btn replay"
				class:speaking={game.phase === 'listening'}
				aria-label="Hear the word again"
				disabled={game.phase !== 'typing'}
				onclick={() => game.replay()}>🔊</button
			>

			<div class="keyboard" role="group" aria-label="Keyboard">
				{#each KEY_ROWS as row, r (row)}
					<div class="row" style="--indent: {r / 3}">
						{#each row.split('') as letter (letter)}
							{#key letter === target ? game.lastPress.n : 0}
								<Keycap
									{letter}
									hand={hand(letter)}
									size="small"
									state={letter === target ? 'next' : 'idle'}
									anim={letter === target && game.hint ? 'hint' : ''}
									onclick={() => game.press(letter)}
								/>
							{/key}
						{/each}
					</div>
				{/each}
			</div>
		</section>
	{:else if game.phase === 'reward'}
		<div class="corner left">
			<button type="button" class="icon" aria-label="Home" onclick={() => game.home()}>⌂</button>
		</div>
		<section class="stage">
			<div class="confetti" aria-hidden="true">
				{#each Array.from({ length: 28 }, (_, i) => i) as i (i)}
					<i style="--x: {(i * 37) % 100}%; --d: {(i % 7) * 90}ms; --c: var(--{['red', 'blue', 'sun', 'leaf'][i % 4]})"></i>
				{/each}
			</div>
			<div class="sticker-wrap">
				{#each Array.from({ length: ROUND_WORDS }, (_, i) => i) as i (i)}
					<span class="star" style="--from-x: {(i - 2) * 2.9}rem" aria-hidden="true">★</span>
				{/each}
				<div class="sticker" aria-label={STICKERS[game.newSticker][game.language]}>{game.newSticker}</div>
			</div>
			<div class="actions">
				<button type="button" class="key-btn play" aria-label="Play again" onclick={() => game.play()}>▶</button>
				<button type="button" class="key-btn home" aria-label="Home" onclick={() => game.home()}>⌂</button>
			</div>
		</section>
	{:else if game.phase === 'stickers'}
		<div class="corner left">
			<button type="button" class="icon" aria-label="Back" onclick={() => game.home()}>⌂</button>
		</div>
		<section class="stage">
			<ul class="stickers">
				{#each Object.entries(STICKERS) as [emoji, names] (emoji)}
					{@const owned = game.progress.stickers.includes(emoji)}
					<li>
						<button
							type="button"
							class:owned
							aria-label={owned ? names[game.language] : 'Not collected yet'}
							disabled={!owned}
							onclick={() => speak(names[game.language], game.language)}>{emoji}</button
						>
					</li>
				{/each}
			</ul>
		</section>
	{/if}
</main>

<ParentDialog bind:this={parent} />

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
		gap: clamp(1.5rem, 4vh, 3rem);
		width: 100%;
	}
	.corner {
		position: absolute;
		top: 1rem;
	}
	.corner.left {
		left: 1rem;
	}
	.corner.right {
		right: 1rem;
	}

	.icon,
	.key-btn,
	.flag,
	.book {
		border: var(--line) solid var(--ink);
		background: var(--paper);
		box-shadow: 0 var(--line) 0 var(--ink);
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.key-btn:active,
	.flag:active,
	.book:active {
		transform: translateY(var(--line));
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		color: inherit;
		text-decoration: none;
		position: relative;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		font-size: 1.9rem;
		line-height: 1;
		display: grid;
		place-items: center;
	}
	.gear {
		box-shadow: none;
		border-width: 2px;
		opacity: 0.6;
		touch-action: none;
	}
	.gear svg {
		position: absolute;
		inset: -6px;
		width: calc(100% + 12px);
		height: calc(100% + 12px);
		transform: rotate(-90deg);
	}
	.ring {
		fill: none;
		stroke: var(--sun);
		stroke-width: 4;
		stroke-dasharray: 107;
		stroke-dashoffset: 107;
	}
	.gear.holding {
		opacity: 1;
	}
	.gear.holding .ring {
		stroke-dashoffset: 0;
		transition: stroke-dashoffset 3s linear !important;
	}

	.key-btn {
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
		animation: bob 4s ease-in-out infinite;
	}
	@keyframes bob {
		0%,
		85%,
		100% {
			transform: translateY(0);
		}
		92% {
			transform: translateY(-10px);
		}
	}
	.home {
		width: clamp(6rem, 18vw, 8rem);
		height: clamp(6rem, 18vw, 8rem);
		font-size: 3.5rem;
	}

	.flags {
		display: flex;
		gap: 2rem;
	}
	.flag {
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		font-size: 3rem;
		line-height: 1;
		opacity: 0.55;
	}
	.flag[aria-pressed='true'] {
		opacity: 1;
		outline: 6px solid var(--ink);
		outline-offset: 4px;
	}

	.book {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		border-radius: 18px;
		padding: 0.5rem 1.2rem;
		font-size: 2.4rem;
	}
	.count {
		font-size: 2rem;
		animation: countpop 300ms ease-out;
	}
	@keyframes countpop {
		50% {
			transform: scale(1.4);
		}
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
		animation: countpop 300ms ease-out;
	}
	/* Word grades: silver = one near slip (neighbour key…), bronze = kept trying. */
	.dots li.silver {
		background: #c9ced6;
	}
	.dots li.bronze {
		background: #e0a172;
	}

	.word-row {
		--hand-w: clamp(2.8rem, 10vw, 6rem);
		--row-gap: clamp(0.3rem, 2vw, 1.5rem);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--row-gap);
		width: 100%;
	}
	/* Both slots always exist so the word never shifts when the hand changes sides. */
	.hand {
		flex: none;
		width: var(--hand-w);
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		box-shadow: 0 var(--line) 0 var(--ink);
		font-size: calc(var(--hand-w) * 0.6);
		line-height: 1;
		visibility: hidden;
	}
	.hand.on {
		visibility: visible;
		animation: pop 220ms cubic-bezier(0.3, 1.6, 0.6, 1);
	}
	.hand.left {
		background: var(--red);
	}
	.hand.right {
		background: var(--blue);
	}
	/* ✋ is a right hand; mirror it for the left. */
	.hand.left span {
		display: inline-block;
		transform: scaleX(-1);
	}
	@keyframes pop {
		from {
			transform: scale(0.6);
		}
	}
	.word {
		--gap: clamp(0.25rem, 1.4vw, 1rem);
		/* Shrink letters so the whole word plus both hand slots fits one line. */
		--cap-w: min(
			clamp(4.2rem, 15vw, 10rem),
			calc((100vw - 2rem - 2 * var(--hand-w) - 2 * var(--row-gap) - (var(--n) - 1) * var(--gap)) / var(--n))
		);
		display: flex;
		justify-content: center;
		gap: var(--gap);
		min-width: 0;
	}
	.replay {
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		font-size: 2.6rem;
	}
	.replay:disabled {
		cursor: default;
	}
	.replay.speaking {
		background: var(--sun);
		animation: speak 600ms ease-in-out infinite;
	}
	@keyframes speak {
		50% {
			box-shadow: 0 var(--line) 0 var(--ink), 0 0 0 12px rgb(246 194 26 / 0.35);
		}
	}

	.keyboard {
		/* 10 keys in the top row: fit them inside the viewport minus padding, gaps and borders. */
		--key-gap: clamp(0.2rem, 1vw, 0.45rem);
		--key-w: min(4.2rem, calc((100vw - 2rem - 2 * var(--kb-pad) - 9 * var(--key-gap) - 2 * var(--line)) / 10));
		--kb-pad: clamp(0.4rem, 2vw, 1rem);
		display: flex;
		flex-direction: column;
		gap: var(--key-gap);
		padding: var(--kb-pad);
		border: var(--line) solid var(--ink);
		border-radius: 22px;
	}
	.row {
		display: flex;
		gap: var(--key-gap);
		padding-left: calc(var(--indent) * var(--key-w));
	}
	/* Phones held upright: narrow keys, but plenty of height, so make them taller to tap. */
	@media (orientation: portrait) and (max-width: 600px) {
		.keyboard {
			--key-ratio: 1.45;
		}
	}

	.sticker {
		font-size: clamp(8rem, 30vw, 14rem);
		line-height: 1;
		width: 1.25em;
		height: 1.25em;
		display: grid;
		place-items: center;
		border: var(--line) solid var(--ink);
		border-radius: 28px;
		background: var(--sun);
		box-shadow: 0 8px 0 var(--ink);
		animation: flip 800ms cubic-bezier(0.3, 1.4, 0.6, 1) 550ms both;
	}
	.sticker-wrap {
		position: relative;
		display: grid;
		place-items: center;
	}
	/* The round's five stars fly from the progress dots into the sticker. */
	.star {
		position: absolute;
		z-index: 1;
		font-size: 2.6rem;
		line-height: 1;
		color: var(--sun);
		-webkit-text-stroke: 2px var(--ink);
		animation: converge 600ms ease-in both;
	}
	@keyframes converge {
		from {
			transform: translate(var(--from-x), -40vh);
		}
		85% {
			opacity: 1;
		}
		to {
			transform: scale(0.4);
			opacity: 0;
		}
	}
	@keyframes flip {
		from {
			transform: perspective(600px) rotateY(180deg) scale(0.4);
		}
	}
	.actions {
		display: flex;
		gap: 2rem;
		align-items: center;
	}
	.confetti {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.confetti i {
		position: absolute;
		top: -2rem;
		left: var(--x);
		width: 0.9rem;
		height: 1.4rem;
		background: var(--c);
		border: 2px solid var(--ink);
		animation: fall 1500ms ease-in var(--d) both;
	}
	@keyframes fall {
		to {
			transform: translateY(110dvh) rotate(540deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.confetti {
			display: none;
		}
	}

	.stickers {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr));
		gap: 1rem;
		width: min(48rem, 100%);
	}
	.stickers button {
		width: 100%;
		aspect-ratio: 1;
		border: 3px dashed #b5b5b5;
		border-radius: 18px;
		background: var(--paper);
		font-size: 3rem;
		line-height: 1;
		filter: grayscale(1);
		opacity: 0.25;
	}
	.stickers button.owned {
		border: var(--line) solid var(--ink);
		background: var(--sun);
		filter: none;
		opacity: 1;
	}
</style>
