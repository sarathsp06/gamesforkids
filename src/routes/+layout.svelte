<script lang="ts">
	import '@fontsource/andika/400.css';
	import '@fontsource/andika/700.css';
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Letter Leap</title>
	<meta name="description" content="Hear a word, find its letters on the keyboard. A typing game for young children." />
</svelte:head>

{@render children()}
