<script lang="ts">
	// Latin only: it holds every English and Dutch letter (é, ë, ï included). These per-subset files carry no
	// unicode-range, so each one imported is downloaded on every page: the Latin Extended files (80 kB each)
	// were fetched for nothing.
	import '@fontsource/andika/latin-400.css';
	import '@fontsource/andika/latin-700.css';
	import '@fontsource/fredoka/latin-500.css';
	import '@fontsource/fredoka/latin-700.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { navigating, page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { soundOn, voiceOn } from '#lib/sound.ts';
	import { currentMode, loadSettings } from '#lib/storage.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	/** Little or Big mode on <html>, so every page sizes its targets for whoever is playing. */
	function applyPlayer() {
		document.documentElement.dataset.mode = currentMode();
		const s = loadSettings();
		soundOn.value = s.sound;
		voiceOn.value = s.voice;
	}
	onMount(applyPlayer);
	$effect(() => {
		void page.url.pathname; // re-read on every navigation: the player or settings may have changed
		applyPlayer();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Games for Kids</title>
	<meta name="description" content="Little learning games for ages 3–9, in English and Dutch. No ads, no accounts." />
</svelte:head>

<!--
	Any page change that takes a moment shows a moving band at the top right away, so a tap always answers
	even on a slow connection. Shown after a short delay, so quick changes don't flicker.
-->
{#if navigating.to}
	<div class="loading" role="progressbar" aria-label="Loading"></div>
{/if}

{@render children()}

<style>
	.loading {
		position: fixed;
		inset: 0 0 auto 0;
		height: 8px;
		z-index: 100;
		background: repeating-linear-gradient(90deg, var(--sun) 0 2rem, var(--blue) 2rem 4rem, var(--red) 4rem 6rem, var(--leaf) 6rem 8rem);
		background-size: 8rem 100%;
		border-bottom: 3px solid var(--ink);
		animation:
			appear 0ms 120ms both,
			slide 600ms linear 120ms infinite;
		pointer-events: none;
	}
	@keyframes appear {
		from {
			opacity: 0;
		}
	}
	@keyframes slide {
		to {
			background-position: 8rem 0;
		}
	}
</style>
