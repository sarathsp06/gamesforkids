<script lang="ts">
	/** A birthday cake with one candle per year: a pre-reader can count what a numeral can't tell them. */
	let { candles, lit = true, width = 88 }: { candles: number; lit?: boolean; width?: number | string } = $props();
	const xs = $derived(Array.from({ length: candles }, (_, i) => 50 + (i - (candles - 1) / 2) * Math.min(14, 64 / Math.max(1, candles - 1))));
	const top = (x: number) => 26 + Math.abs(x - 50) * 0.12;
</script>

<svg {width} viewBox="0 0 100 90" aria-hidden="true" style="height: auto">
	<path d="M14 52 Q50 40 86 52 L86 80 Q50 92 14 80 Z" fill="var(--blush)" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
	<path d="M14 52 Q50 64 86 52" fill="none" stroke="var(--ink)" stroke-width="4" />
	{#each xs as x, i (i)}
		<path d="M{x} 48 V{top(x)}" stroke="var(--ink)" stroke-width={candles > 6 ? 3.5 : 4} stroke-linecap="round" />
		<ellipse cx={x} cy={top(x) - 6} rx={candles > 6 ? 3.6 : 5} ry={candles > 6 ? 5.6 : 7} fill={lit ? 'var(--sun)' : 'var(--white)'} stroke="var(--ink)" stroke-width="3" />
	{/each}
</svg>
