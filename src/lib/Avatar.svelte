<script lang="ts">
	/** A player's face: one of a few drawn looks, picked by number. No photos, nothing typed by the child. */
	import { AVATARS } from './players';

	let { avatar, size = 80 }: { avatar: number; size?: number | string } = $props();
	const look = $derived(AVATARS[((avatar % AVATARS.length) + AVATARS.length) % AVATARS.length]);
</script>

<svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
	<circle cx="50" cy="54" r="34" fill={look.skin} stroke="var(--ink)" stroke-width="4" />
	{#if look.hair === 'bob'}
		<path d="M16 54 Q14 14 50 14 Q86 14 84 54 Q78 36 50 34 Q22 36 16 54 Z" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
	{:else if look.hair === 'short'}
		<path d="M18 46 Q22 12 50 14 Q78 12 82 46 Q70 30 50 30 Q30 30 18 46 Z" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
	{:else if look.hair === 'curly'}
		<circle cx="26" cy="34" r="10" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" />
		<circle cx="42" cy="22" r="10" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" />
		<circle cx="60" cy="22" r="10" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" />
		<circle cx="76" cy="34" r="10" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" />
	{:else if look.hair === 'bun'}
		<circle cx="50" cy="16" r="9" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" />
		<path d="M18 48 Q22 20 50 22 Q78 20 82 48 Q70 36 50 36 Q30 36 18 48 Z" fill={look.hairColor} stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
	{/if}
	<circle cx="38" cy="56" r="4" fill="var(--ink)" />
	<circle cx="62" cy="56" r="4" fill="var(--ink)" />
	<path d="M40 70 Q50 78 60 70" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" />
	{#if look.glasses}
		<rect x="26" y="48" width="20" height="14" rx="6" fill="none" stroke="var(--blue)" stroke-width="4" />
		<rect x="54" y="48" width="20" height="14" rx="6" fill="none" stroke="var(--blue)" stroke-width="4" />
		<path d="M46 55 L54 55" stroke="var(--blue)" stroke-width="4" />
	{/if}
	{#if look.flower}
		<circle cx="20" cy="62" r="6" fill="var(--sun)" stroke="var(--ink)" stroke-width="3" />
	{/if}
</svg>
