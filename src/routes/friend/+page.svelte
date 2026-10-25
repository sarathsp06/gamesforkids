<script lang="ts">
	/**
	 * Where the "Add a friend" QR code lands on the friend's device (design/presence, board 7b). The one-time
	 * key is in the #fragment, which the browser never sends anywhere; it is read once and removed from the
	 * address bar. Scanning is the grown-up's yes: the two devices swap faces and are friends.
	 */
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Avatar from '#lib/Avatar.svelte';
	import { pair } from '#lib/pairing.ts';
	import { isKey } from '#lib/presence.ts';
	import { addFriend } from '#lib/presence.svelte.ts';
	import { currentPlayer, loadLanguage, loadPlayers, loadSettings, saveSettings } from '#lib/storage.ts';
	import type { Language } from '#lib/words.ts';

	let language = $state<Language>('en');
	let mode = $state<'none' | 'connecting' | 'added' | 'gone'>('none');
	let friendAvatar = $state(0);
	let close: (() => void) | null = null;

	const T = {
		en: {
			title: 'Add a friend',
			none: 'Open this page by scanning the QR code on the other device: Grown-ups, Add a friend.',
			connecting: 'Finding the other device…',
			now: 'Friends now!',
			nowHint: 'Your child sees this friend with a heart in Paint Pot and can ask them to paint together. "Play with others" is now on; you can turn it off in Grown-ups.',
			gone: 'The other device didn\'t answer. Make a new code there and scan it again.',
			play: 'Who is playing?'
		},
		nl: {
			title: 'Voeg een vriendje toe',
			none: 'Open deze pagina door de QR-code op het andere apparaat te scannen: Volwassenen, Voeg een vriendje toe.',
			connecting: 'Het andere apparaat zoeken…',
			now: 'Nu vriendjes!',
			nowHint: 'Je kind ziet dit vriendje met een hartje in Verfpot en kan vragen om samen te schilderen. "Samen met anderen" staat nu aan; je kunt het uitzetten bij Volwassenen.',
			gone: 'Het andere apparaat antwoordde niet. Maak daar een nieuwe code en scan die opnieuw.',
			play: 'Wie speelt er?'
		}
	};
	const s = $derived(T[language]);
	const myAvatar = () => (currentPlayer() ?? loadPlayers().list[0])?.avatar ?? 0;

	onMount(() => {
		language = loadLanguage();
		const hash = location.hash.slice(1);
		// Read once, then off the address bar, so a reload or a shared screenshot doesn't carry it.
		history.replaceState(null, '', location.pathname);
		const key = hash.startsWith('pair=') ? hash.slice(5) : '';
		if (!isKey(key)) return;
		mode = 'connecting';
		void pair(
			key,
			myAvatar(),
			(h) => {
				if (mode !== 'connecting') return;
				addFriend(h.key, h.avatar);
				friendAvatar = h.avatar;
				// Painting with a friend needs the switch: scanning the code is the grown-up saying yes to it.
				const settings = loadSettings();
				if (!settings.online) saveSettings({ ...settings, online: true });
				mode = 'added';
				const c = close;
				close = null;
				setTimeout(() => c?.(), 3000);
			},
			() => {
				if (mode === 'connecting') mode = 'gone';
			}
		).then((c) => (close = c));
	});
	onDestroy(() => close?.());
</script>

<svelte:head><title>Add a friend — Games for Kids</title></svelte:head>

<main>
	<h1>{s.title}</h1>
	{#if mode === 'none'}
		<p>{s.none}</p>
	{:else if mode === 'connecting'}
		<p>{s.connecting}</p>
	{:else if mode === 'added'}
		<section class="now">
			<div class="faces">
				<Avatar avatar={myAvatar()} size={88} />
				<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" /></svg>
				<Avatar avatar={friendAvatar} size={88} />
			</div>
			<h2>{s.now}</h2>
			<p>{s.nowHint}</p>
		</section>
	{:else}
		<p class="warn">{s.gone}</p>
	{/if}
	{#if mode !== 'connecting'}
		<a class="go" href={resolve('/')}>{s.play}</a>
	{/if}
</main>

<style>
	main {
		max-width: 40rem;
		margin: 0 auto;
		min-height: 100dvh;
		padding: 2rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.8rem;
	}
	h2 {
		margin: 0;
		font-size: 1.9rem;
	}
	p {
		margin: 0;
		line-height: 1.5;
	}
	.warn {
		color: var(--red);
	}
	.now {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem 1rem;
		border: 3px solid var(--ink);
		border-radius: 22px;
		background: var(--mint);
		text-align: center;
	}
	.faces {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.heart {
		width: 56px;
		height: 56px;
		fill: var(--red);
		stroke: var(--ink);
		stroke-width: 1.6;
	}
	.go {
		font: inherit;
		font-family: var(--title);
		font-weight: 700;
		min-height: 3rem;
		display: inline-flex;
		align-items: center;
		padding: 0.5rem 1.2rem;
		border: 3px solid var(--ink);
		border-radius: 14px;
		background: var(--sun);
		box-shadow: 0 4px 0 var(--ink);
		color: inherit;
		text-decoration: none;
		align-self: center;
	}
</style>
