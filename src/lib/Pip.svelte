<script lang="ts">
	/**
	 * Pip the owl: the one voice of the app. Shows a line in a bubble and says it; tapping Pip says it again.
	 * `line` is a catalog Line (recorded clip) or plain text (browser voice).
	 */
	import { speak } from './audio';
	import type { Line } from './i18n';
	import type { Language } from './words';

	let {
		line,
		language,
		mood = 'idle',
		size = 96,
		autoSay = false
	}: { line?: Line | string; language: Language; mood?: 'idle' | 'happy'; size?: number; autoSay?: boolean } = $props();

	const text = $derived(typeof line === 'string' ? line : (line?.text ?? ''));
	const say = () => line && speak(line, language);

	let said = '';
	$effect(() => {
		// Say a new line once when it appears, when the page asks for it.
		if (autoSay && text && text !== said) {
			said = text;
			say();
		}
	});
</script>

<div class="pip" class:bubble-after={!!text}>
	<button type="button" class="owl {mood}" aria-label={text ? 'Hear it again' : 'Pip'} onclick={say} disabled={!line}>
		<svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Pip the owl">
			<path d="M22 30 L16 10 L34 24 M78 30 L84 10 L66 24" fill="#8B5A2B" stroke="var(--ink)" stroke-width="4" stroke-linejoin="round" />
			<ellipse cx="50" cy="56" rx="34" ry="36" fill="#8B5A2B" stroke="var(--ink)" stroke-width="4" />
			<ellipse cx="50" cy="66" rx="20" ry="22" fill="var(--sun)" stroke="var(--ink)" stroke-width="4" />
			{#if mood === 'happy'}
				<path d="M26 46 Q37 34 48 46" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" />
				<path d="M52 46 Q63 34 74 46" fill="none" stroke="var(--ink)" stroke-width="5" stroke-linecap="round" />
			{:else}
				<circle cx="37" cy="44" r="12" fill="var(--paper)" stroke="var(--ink)" stroke-width="4" />
				<circle cx="63" cy="44" r="12" fill="var(--paper)" stroke="var(--ink)" stroke-width="4" />
				<circle class="eye" cx="39" cy="45" r="5" fill="var(--ink)" />
				<circle class="eye" cx="65" cy="45" r="5" fill="var(--ink)" />
			{/if}
			<path d="M44 55 L56 55 L50 63 Z" fill="var(--red)" stroke="var(--ink)" stroke-width="3" stroke-linejoin="round" />
			<path d="M40 92 L36 98 M44 92 L44 98 M56 92 L56 98 M60 92 L64 98" stroke="var(--ink)" stroke-width="4" stroke-linecap="round" />
		</svg>
	</button>
	{#if text}
		<div class="bubble">{text}</div>
	{/if}
</div>

<style>
	.pip {
		display: flex;
		align-items: center;
		gap: 0.9rem;
		max-width: 100%;
	}
	.owl {
		padding: 0;
		border: 0;
		background: none;
		border-radius: 50%;
		line-height: 0;
		cursor: pointer;
	}
	.owl:disabled {
		cursor: default;
	}
	.owl:active svg {
		transform: scale(0.94);
	}
	.owl svg {
		transition: transform 120ms;
	}
	.owl.happy svg {
		animation: hop 500ms ease-out;
	}
	@keyframes hop {
		40% {
			transform: translateY(-12%);
		}
	}
	.bubble {
		position: relative;
		padding: 0.7rem 1.1rem;
		border: var(--line) solid var(--ink);
		border-radius: 20px;
		background: #fff;
		font-size: clamp(1.25rem, 3.5vw, 1.7rem);
		line-height: 1.2;
	}
	.bubble::before {
		content: '';
		position: absolute;
		left: -0.8rem;
		top: 50%;
		width: 1.1rem;
		height: 1.1rem;
		margin-top: -0.55rem;
		background: #fff;
		border-left: var(--line) solid var(--ink);
		border-bottom: var(--line) solid var(--ink);
		transform: rotate(45deg);
	}
	@media (prefers-reduced-motion: reduce) {
		.owl.happy svg {
			animation: none;
		}
	}
</style>
