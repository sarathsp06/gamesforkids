<script lang="ts">
	import type { Hand } from './words';

	let {
		letter,
		hand,
		state = 'idle',
		size = 'big',
		anim = '',
		onclick
	}: {
		letter: string;
		hand: Hand;
		state?: 'idle' | 'next' | 'done' | 'blank';
		size?: 'big' | 'small';
		/** One-shot animation class; re-key the component to replay it. */
		anim?: '' | 'press' | 'wobble' | 'pop' | 'hint' | 'cheer';
		onclick?: () => void;
	} = $props();
</script>

{#if onclick}
	<button type="button" class="cap {size} {hand} {state} {anim}" {onclick} aria-label={letter}>{letter}</button>
{:else}
	<span class="cap {size} {hand} {state} {anim}" aria-hidden={state === 'blank'}>{state === 'blank' ? '' : letter}</span>
{/if}

<style>
	.cap {
		display: inline-grid;
		place-items: center;
		border: var(--line) solid var(--ink);
		border-radius: 14px;
		box-shadow: 0 var(--line) 0 var(--ink);
		font-weight: 700;
		line-height: 1;
		color: var(--paper);
		user-select: none;
		transition: background-color 150ms, transform 150ms, box-shadow 150ms;
	}
	/* Parents may set --cap-w / --key-w so a whole word or keyboard row fits narrow screens. */
	.big {
		--w: var(--cap-w, clamp(4.2rem, 15vw, 10rem));
		width: var(--w);
		height: calc(var(--w) * 1.15);
		font-size: calc(var(--w) * 0.8);
	}
	.small {
		--w: var(--key-w, clamp(2.6rem, 8vw, 4.2rem));
		width: var(--w);
		height: calc(var(--w) * var(--key-ratio, 1.06));
		font-size: clamp(1.1rem, calc(var(--w) * 0.45), 1.8rem);
		border-width: 3px;
		border-radius: 10px;
		box-shadow: 0 3px 0 var(--ink);
		padding: 0;
	}
	.left {
		background: var(--red);
	}
	.right {
		background: var(--blue);
	}
	.done {
		background: var(--leaf);
		transform: translateY(var(--line));
		box-shadow: 0 0 0 var(--ink);
	}
	.next {
		background: var(--sun);
		color: var(--ink);
		outline: 6px solid var(--ink);
		outline-offset: 4px;
	}
	.blank {
		opacity: 0.55;
	}
	.small.idle {
		opacity: 0.85;
	}
	.press {
		animation: press 160ms ease-out;
	}
	.wobble {
		animation: wobble 300ms ease-in-out;
	}
	.pop {
		animation: pop 220ms cubic-bezier(0.3, 1.6, 0.6, 1) both;
	}
	.hint {
		animation: pulse 700ms ease-in-out 3;
	}
	.cheer {
		animation: cheer 420ms ease-out both;
		animation-delay: var(--delay, 0ms);
	}
	@keyframes cheer {
		40% {
			transform: translateY(-28%);
		}
	}
	@keyframes press {
		50% {
			transform: translateY(calc(var(--line) * 2));
		}
	}
	@keyframes wobble {
		25% {
			transform: rotate(-6deg);
		}
		75% {
			transform: rotate(6deg);
		}
	}
	@keyframes pop {
		from {
			transform: scale(0.6);
		}
	}
	@keyframes pulse {
		50% {
			transform: scale(1.18);
		}
	}
</style>
