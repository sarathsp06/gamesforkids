<script lang="ts">
	/**
	 * The one orchestrated moment of a round: the stars gather, a sticker flips in, Pip cheers and says its
	 * name. The same in every game, so the child meets one reward, not seven.
	 */
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';
	import Pip from './Pip.svelte';
	import Emoji from './Emoji.svelte';
	import { sfx, speak } from './audio';
	import { t, type Line } from './i18n';
	import type { Grade } from './score';
	import { STICKERS, type Language } from './words';
	import { loadStickers } from './stickers';

	let {
		grades,
		sticker,
		language,
		onAgain,
		sayFirst = []
	}: { grades: Grade[]; sticker: string; language: Language; onAgain: () => void; sayFirst?: Line[] } = $props();

	const owned = loadStickers();
	const book = Object.keys(STICKERS).slice(0, 12);
	const line = $derived([...sayFirst, t(language, 'home.done'), t(language, 'home.sticker')]);

	onMount(() => {
		sfx.chime();
		const id = setTimeout(() => speak(line, language), 900); // after the stars have gathered
		return () => clearTimeout(id);
	});
</script>

<section class="reward">
	<div class="left">
		<div class="frame">
			<div class="stars" aria-label="Round: {grades.length} stars">
				{#each grades as g, i (i)}
					<span class="star {g}" style="--i: {i}"><Icon name="star" size={18} /></span>
				{/each}
			</div>
			<div class="sticker"><Emoji glyph={sticker} size="100%" label={STICKERS[sticker]?.[language]} /></div>
			<span class="badge" aria-hidden="true"><Icon name="star" size={28} /></span>
		</div>
		<Pip {language} mood="happy" size={72} line={t(language, 'home.done')} />
	</div>
	<div class="right">
		<div class="book" aria-label="Sticker book">
			{#each book as s, i (s)}
				<span class="cell c{i % 4}" class:has={owned.includes(s) || s === sticker}>{#if owned.includes(s) || s === sticker}<Emoji glyph={s} size="70%" />{/if}</span>
			{/each}
		</div>
		<div class="actions">
			<button type="button" class="big play" aria-label="Play again" onclick={onAgain}><Icon name="play" size={52} /></button>
			<button type="button" class="big" aria-label="Another game" onclick={() => goto(resolve('/home'))}><Icon name="games" size={52} /></button>
		</div>
	</div>
</section>

<style>
	.reward {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 22rem);
		gap: 2.2rem;
		align-items: center;
		width: 100%;
		max-width: 60rem;
	}
	.left {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.4rem;
	}
	.frame {
		position: relative;
		width: min(18rem, 70vw);
		aspect-ratio: 1;
		border: var(--line) solid var(--ink);
		border-radius: 40px;
		background: var(--white);
		box-shadow: 0 10px 0 var(--ink);
		display: grid;
		place-items: center;
	}
	.sticker {
		width: 70%;
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		animation: flip 800ms cubic-bezier(0.3, 1.4, 0.6, 1) 500ms both;
	}
	@keyframes flip {
		from {
			transform: rotateY(90deg) scale(0.6);
			opacity: 0;
		}
	}
	.badge {
		position: absolute;
		top: -1.1rem;
		right: -1.1rem;
		width: 3.5rem;
		height: 3.5rem;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		background: var(--sun);
		display: grid;
		place-items: center;
		animation: flip 600ms ease-out 1100ms both;
	}
	.stars {
		position: absolute;
		top: -1.1rem;
		left: 50%;
		display: flex;
		gap: 0.4rem;
		transform: translateX(-50%);
	}
	.star {
		width: 2.1rem;
		height: 2.1rem;
		border: 3px solid var(--ink);
		border-radius: 50%;
		display: grid;
		place-items: center;
		animation: gather 500ms cubic-bezier(0.3, 1.2, 0.6, 1) calc(var(--i) * 90ms) both;
	}
	@keyframes gather {
		from {
			transform: translateY(6rem) scale(0.5);
			opacity: 0;
		}
	}
	.star.gold {
		background: var(--sun);
	}
	.star.silver {
		background: var(--silver);
	}
	.star.bronze {
		background: var(--bronze);
	}
	.right {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.book {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.6rem;
		padding: 1rem;
		border: var(--line) solid var(--ink);
		border-radius: 28px;
		background: var(--white);
	}
	.cell {
		aspect-ratio: 1;
		border: 3px dashed #b8b4aa;
		border-radius: 14px;
		background: var(--paper);
		display: grid;
		place-items: center;
		font-size: 2rem;
		line-height: 1;
	}
	.cell.has {
		border: 3px solid var(--ink);
	}
	.cell.has.c0 {
		background: var(--butter);
	}
	.cell.has.c1 {
		background: var(--sky);
	}
	.cell.has.c2 {
		background: var(--blush);
	}
	.cell.has.c3 {
		background: var(--mint);
	}
	.actions {
		display: flex;
		justify-content: center;
		gap: 1rem;
	}
	.big {
		width: 7rem;
		height: 7rem;
		border: var(--line) solid var(--ink);
		border-radius: 30px;
		background: var(--white);
		box-shadow: 0 8px 0 var(--ink);
		display: grid;
		place-items: center;
		padding: 0;
		color: var(--ink);
	}
	.big.play {
		background: var(--sun);
	}
	.big:active {
		transform: translateY(8px);
		box-shadow: none;
	}
	@media (max-width: 760px) {
		.reward {
			grid-template-columns: 1fr;
			gap: 1.4rem;
		}
		.book {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sticker,
		.badge,
		.star {
			animation: none;
		}
	}
</style>
