<script lang="ts">
	/** The grown-ups' gate: hold the gear for three seconds (a ring fills); a tap does nothing. */
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from './Icon.svelte';

	let { size = 56 }: { size?: number } = $props();
	const HOLD_MS = 3000;
	let holding = $state(false);
	let timer = 0;

	function start() {
		holding = true;
		timer = window.setTimeout(() => {
			holding = false;
			goto(resolve('/grownups'));
		}, HOLD_MS);
	}
	function stop() {
		holding = false;
		clearTimeout(timer);
	}
</script>

<button
	type="button"
	class="gear"
	class:holding
	style="--size: {size}px"
	aria-label="Grown-ups: hold for three seconds"
	onpointerdown={start}
	onpointerup={stop}
	onpointerleave={stop}
	onpointercancel={stop}
	onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && !e.repeat && start()}
	onkeyup={stop}
	oncontextmenu={(e) => e.preventDefault()}
>
	<svg class="ring" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" /></svg>
	<Icon name="gear" size={Math.round(size * 0.5)} />
</button>

<style>
	.gear {
		position: relative;
		width: var(--size);
		height: var(--size);
		display: grid;
		place-items: center;
		padding: 0;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		background: var(--white);
		color: var(--ink);
	}
	.ring {
		position: absolute;
		inset: -6px;
		width: calc(100% + 12px);
		height: calc(100% + 12px);
		transform: rotate(-90deg);
		pointer-events: none;
	}
	.ring circle {
		fill: none;
		stroke: var(--sun);
		stroke-width: 5;
		stroke-dasharray: 107;
		stroke-dashoffset: 107;
	}
	.holding .ring circle {
		animation: fill 3000ms linear forwards;
	}
	@keyframes fill {
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
