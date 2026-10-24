<script lang="ts">
	import '@fontsource/andika/400.css';
	import '@fontsource/andika/700.css';
	import '@fontsource/fredoka/500.css';
	import '@fontsource/fredoka/700.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import favicon from '#lib/assets/favicon.svg';
	import { soundOn, voiceOn } from '#lib/audio.ts';
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

{@render children()}
