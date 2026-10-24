<script lang="ts">
	/** The picture on each game's home tile, drawn in the app's own style. */
	let { game, width = 170 }: { game: string; width?: number | string } = $props();
</script>

<svg {width} viewBox="0 0 120 100" aria-hidden="true" style="height: auto">
	{#if game === 'spell'}
		<rect x="8" y="30" width="48" height="48" rx="12" fill="var(--leaf)" stroke="var(--ink)" stroke-width="4" />
		<text x="32" y="66" text-anchor="middle" font-family="Andika, sans-serif" font-size="36" font-weight="700" fill="#fff">c</text>
		<path d="M66 46v16h8l10 8V38l-10 8h-8z" fill="var(--ink)" />
		<path d="M92 46a8 8 0 0 1 0 16M99 40a16 16 0 0 1 0 28" fill="none" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" />
	{:else if game === 'shapes'}
		<path d="M34 22 L60 70 L8 70 Z" fill="var(--blue)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
		<circle cx="88" cy="48" r="26" fill="var(--red)" stroke="var(--ink)" stroke-width="4" />
	{:else if game === 'paint'}
		<path d="M20 84 L74 30 L90 46 L36 100" fill="var(--sun)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
		<path d="M74 30 L86 18 Q96 10 102 16 Q108 22 100 32 L90 46" fill="#8b5a2b" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
		<path d="M20 84 Q10 96 24 98 Q34 100 36 100" fill="var(--blue)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
	{:else if game === 'letters'}
		<rect x="12" y="28" width="44" height="44" rx="10" fill="var(--red)" stroke="var(--ink)" stroke-width="4" />
		<text x="34" y="62" text-anchor="middle" font-family="Andika, sans-serif" font-size="32" font-weight="700" fill="#fff">A</text>
		<rect x="64" y="28" width="44" height="44" rx="10" fill="var(--blue)" stroke="var(--ink)" stroke-width="4" />
		<text x="86" y="62" text-anchor="middle" font-family="Andika, sans-serif" font-size="32" font-weight="700" fill="#fff">B</text>
	{:else if game === 'math'}
		<circle cx="30" cy="40" r="12" fill="var(--sun)" stroke="var(--ink)" stroke-width="4" />
		<circle cx="60" cy="40" r="12" fill="var(--sun)" stroke="var(--ink)" stroke-width="4" />
		<circle cx="90" cy="40" r="12" fill="var(--sun)" stroke="var(--ink)" stroke-width="4" />
		<circle cx="45" cy="70" r="12" fill="#fff" stroke="var(--ink)" stroke-width="4" stroke-dasharray="6 5" />
		<circle cx="75" cy="70" r="12" fill="#fff" stroke="var(--ink)" stroke-width="4" stroke-dasharray="6 5" />
	{:else if game === 'chess'}
		<rect x="14" y="18" width="30" height="30" fill="var(--ink)" /><rect x="44" y="48" width="30" height="30" fill="var(--ink)" />
		<rect x="14" y="18" width="60" height="60" fill="none" stroke="var(--ink)" stroke-width="4" />
		<path d="M86 70 L106 70 L104 60 L96 56 L100 44 L90 38 L84 46 L90 54 L84 60 Z" fill="#fff" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
	{:else if game === 'read'}
		<path d="M16 26 Q40 20 58 30 L58 80 Q40 70 16 76 Z" fill="#fff" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
		<path d="M100 26 Q76 20 58 30 L58 80 Q76 70 100 76 Z" fill="#fff" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
		<path d="M26 40h22M26 50h22M26 60h16M68 40h22M68 50h22" stroke="var(--leaf)" stroke-width="5" stroke-linecap="round" />
	{/if}
</svg>
