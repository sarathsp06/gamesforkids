<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Icon from '#lib/Icon.svelte';
	import Pip from '#lib/Pip.svelte';
	import { speak, stopSpeech } from '#lib/audio.ts';
	import { animal } from '#lib/i18n.ts';
	import { STICKERS, type Language } from '#lib/words.ts';
	import { loadLanguage } from '#lib/storage.ts';
	import { loadStickers } from '#lib/stickers.ts';

	let language = $state<Language>('en');
	let owned = $state<string[]>([]);

	onMount(() => {
		language = loadLanguage();
		owned = loadStickers();
		return stopSpeech;
	});
</script>

<main>
	<header>
		<a class="round" href={resolve('/home')} aria-label="Home"><Icon name="home" size={30} /></a>
		<Pip {language} size={64} line={owned.length ? undefined : language === 'nl' ? 'Nog geen stickers. Speel een rondje!' : 'No stickers yet. Play a round!'} />
	</header>
	<ul class="book" aria-label="Sticker book: {owned.length} of {Object.keys(STICKERS).length}">
		{#each Object.entries(STICKERS) as [emoji, names] (emoji)}
			{@const has = owned.includes(emoji)}
			<li>
				<button type="button" class:has disabled={!has} aria-label={has ? names[language] : 'Not collected yet'} onclick={() => speak(animal(language, emoji), language)}>
					{#if has}{emoji}{/if}
				</button>
			</li>
		{/each}
	</ul>
</main>

<style>
	main {
		min-height: 100dvh;
		padding: 1.6rem 2rem 2.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.6rem;
		align-items: center;
	}
	header {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		width: 100%;
		max-width: 48rem;
	}
	.round {
		width: var(--tap);
		height: var(--tap);
		min-width: 4rem;
		min-height: 4rem;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		background: var(--white);
		box-shadow: 0 6px 0 var(--ink);
		display: grid;
		place-items: center;
		color: inherit;
		flex: none;
	}
	.round:active {
		transform: translateY(6px);
		box-shadow: none;
	}
	.book {
		list-style: none;
		margin: 0;
		padding: 1rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
		gap: 0.7rem;
		width: 100%;
		max-width: 48rem;
		border: var(--line) solid var(--ink);
		border-radius: 28px;
		background: var(--white);
	}
	.book button {
		width: 100%;
		aspect-ratio: 1;
		border: 3px dashed #b8b4aa;
		border-radius: 16px;
		background: var(--paper);
		font-size: 2.6rem;
		line-height: 1;
		display: grid;
		place-items: center;
		padding: 0;
	}
	.book button.has {
		border: 3px solid var(--ink);
		background: var(--butter);
		cursor: pointer;
	}
	.book li:nth-child(4n + 2) button.has {
		background: var(--sky);
	}
	.book li:nth-child(4n + 3) button.has {
		background: var(--blush);
	}
	.book li:nth-child(4n) button.has {
		background: var(--mint);
	}
	.book button.has:active {
		transform: scale(0.94);
	}
</style>
