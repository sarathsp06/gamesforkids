<script lang="ts">
	/** Drawn icons for the game chrome: one stroke style everywhere, no emoji, so they look the same on every device. */
	export type IconName =
		| 'home' | 'play' | 'speaker' | 'star' | 'gear' | 'undo' | 'brush' | 'bucket' | 'check' | 'book'
		| 'plus' | 'close' | 'lock' | 'mic' | 'retry' | 'games' | 'nl' | 'en';
	let { name, size = 24 }: { name: IconName; size?: number | string } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2.4"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	class="icon-{name}"
>
	{#if name === 'home'}
		<path d="M3 11 L12 3 L21 11" /><path d="M5 10v10h5v-6h4v6h5V10" />
	{:else if name === 'play'}
		<path d="M7 4 L19 12 L7 20 Z" fill="currentColor" stroke="none" />
	{:else if name === 'speaker'}
		<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
	{:else if name === 'star'}
		<path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor" stroke="none" />
	{:else if name === 'gear'}
		<circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
	{:else if name === 'undo'}
		<path d="M9 14 L4 9 L9 4" /><path d="M4 9h9a6 6 0 0 1 0 12h-3" />
	{:else if name === 'brush'}
		<path d="M14 3 L21 10 L10 21 L3 14 Z" fill="currentColor" stroke="none" opacity="0.25" /><path d="M14 3 L21 10 L10 21 L3 14 Z" /><path d="M3 14 Q1 18 4 21 Q8 21 10 21" />
	{:else if name === 'bucket'}
		<path d="M4 9 L20 9 L18 20 L6 20 Z" fill="currentColor" stroke="none" opacity="0.25" /><path d="M4 9 L20 9 L18 20 L6 20 Z" /><path d="M8 9 Q8 3 12 3 Q16 3 16 9" /><path d="M20 10 Q23 13 21 16" />
	{:else if name === 'check'}
		<path d="M4 12.5 L9.5 18 L20 6" stroke-width="3" />
	{:else if name === 'book'}
		<path d="M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
	{:else if name === 'plus'}
		<path d="M12 5v14M5 12h14" />
	{:else if name === 'close'}
		<path d="M6 6l12 12M18 6L6 18" />
	{:else if name === 'lock'}
		<rect x="4" y="10" width="16" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
	{:else if name === 'mic'}
		<path d="M12 3a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4z" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
	{:else if name === 'retry'}
		<path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" />
	{:else if name === 'games'}
		<rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" />
	{:else if name === 'nl'}
		<circle cx="12" cy="12" r="11" fill="#FFFFFF" stroke="var(--ink)" stroke-width="2" /><path d="M2.5 8.5h19" stroke="var(--red)" stroke-width="4" /><path d="M2.5 15.5h19" stroke="var(--blue)" stroke-width="4" />
	{:else if name === 'en'}
		<circle cx="12" cy="12" r="11" fill="var(--blue)" stroke="var(--ink)" stroke-width="2" /><path d="M12 2v20M2 12h20" stroke="#FFFFFF" stroke-width="5" /><path d="M12 2v20M2 12h20" stroke="var(--red)" stroke-width="2.4" />
	{/if}
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
</style>
