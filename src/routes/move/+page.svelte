<script lang="ts">
	/**
	 * Where a QR code or a small link lands on the other device (design/progress-transfer). The key or the
	 * progress is in the #fragment, which the browser never sends anywhere; it is read once and removed from
	 * the address bar. Nothing is added until a grown-up says yes.
	 */
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Emoji from '#lib/Emoji.svelte';
	import ImportConfirm from '#lib/ImportConfirm.svelte';
	import { handoff, matchPictures, type Handoff } from '#lib/handoff.ts';
	import { isKey } from '#lib/presence.ts';
	import { fromLink, gather, type Bundle } from '#lib/transfer.ts';
	import { loadLanguage, loadPlayers } from '#lib/storage.ts';
	import type { Language } from '#lib/words.ts';

	let language = $state<Language>('en');
	let mode = $state<'none' | 'connecting' | 'match' | 'confirm' | 'back' | 'sent' | 'done' | 'bad' | 'gone'>('none');
	let match = $state<[string, string] | null>(null);
	let incoming = $state<Bundle | null>(null);
	let dropped = $state(0);
	let session: Handoff | null = null;
	let peer: string | null = null;

	const T = {
		en: {
			title: 'Move progress to this device',
			none: 'Open this page from the QR code or the link on the other device: Grown-ups, Move to another device.',
			connecting: 'Connecting to the other device…',
			check: 'Check that the other device shows these two pictures, then tap Send there.',
			back: 'Send this device\'s own progress back too, so both match?',
			sendBack: 'Yes, send it back', skip: 'No thanks',
			sent: 'Sent back. The other device asks its grown-up first.',
			done: (n: number) => (n ? `Added. ${n} picture${n === 1 ? '' : 's'} didn't fit on this device.` : 'Added.'),
			bad: 'This link doesn\'t work: it may be cut short, or from a newer version. Make a new one on the other device.',
			gone: 'The other device left. Make a new code there to try again.',
			play: 'Who is playing?'
		},
		nl: {
			title: 'Voortgang naar dit apparaat',
			none: 'Open deze pagina met de QR-code of de link van het andere apparaat: Volwassenen, Naar een ander apparaat.',
			connecting: 'Verbinden met het andere apparaat…',
			check: 'Kijk of het andere apparaat deze twee plaatjes toont, en tik daar op Stuur.',
			back: 'Ook de voortgang van dit apparaat terugsturen, zodat ze gelijk zijn?',
			sendBack: 'Ja, stuur terug', skip: 'Nee, dank je',
			sent: 'Teruggestuurd. Het andere apparaat vraagt eerst de volwassene.',
			done: (n: number) => (n ? `Toegevoegd. ${n} tekening${n === 1 ? '' : 'en'} pasten niet op dit apparaat.` : 'Toegevoegd.'),
			bad: 'Deze link werkt niet: misschien is hij afgeknipt, of van een nieuwere versie. Maak een nieuwe op het andere apparaat.',
			gone: 'Het andere apparaat is weg. Maak daar een nieuwe code om het opnieuw te proberen.',
			play: 'Wie speelt er?'
		}
	};
	const s = $derived(T[language]);

	onMount(() => {
		language = loadLanguage();
		void arrive();
		// A second link opened in this same tab changes only the #fragment: read that one too.
		const again = () => location.hash && void arrive();
		window.addEventListener('hashchange', again);
		return () => window.removeEventListener('hashchange', again);
	});

	async function arrive() {
		const hash = location.hash.slice(1);
		session?.leave();
		session = null;
		peer = null;
		incoming = null;
		mode = 'none';
		// Read once, then off the address bar, so a reload or a shared screenshot doesn't carry it.
		history.replaceState(null, '', location.pathname);
		const [kind, value] = [hash.slice(0, hash.indexOf('=')), hash.slice(hash.indexOf('=') + 1)];
		if (kind === 'move') {
			incoming = await fromLink(value);
			mode = incoming ? 'confirm' : 'bad';
		} else if (kind === 'take' && isKey(value)) {
			mode = 'connecting';
			match = await matchPictures(value);
			session = await handoff(value, {
				onPeer: (p) => {
					peer = p;
					if (p && mode === 'connecting') mode = 'match';
					if (!p && (mode === 'match' || mode === 'connecting')) mode = 'gone';
				},
				onBundle: (b) => {
					incoming = b;
					mode = 'confirm';
				},
				onBad: () => (mode = 'bad')
			});
		} else if (hash) mode = 'bad';
	}
	onDestroy(() => session?.leave());

	function confirmed(taken: boolean, n: number) {
		dropped = n;
		incoming = null;
		// After a live send, offer to make both devices match.
		mode = taken && session && peer ? 'back' : taken ? 'done' : 'none';
		if (mode !== 'back') session?.leave();
	}
	function sendBack() {
		if (session && peer && loadPlayers().list.length) session.send(gather(), peer);
		mode = 'sent';
	}
</script>

<svelte:head><title>Move progress — Games for Kids</title></svelte:head>

<main>
	<h1>{s.title}</h1>
	{#if mode === 'none'}
		<p>{s.none}</p>
	{:else if mode === 'connecting'}
		<p>{s.connecting}</p>
		{#if match}<div class="match"><Emoji glyph={match[0]} size={64} /><Emoji glyph={match[1]} size={64} /></div>{/if}
	{:else if mode === 'match' && match}
		<p>{s.check}</p>
		<div class="match"><Emoji glyph={match[0]} size={64} /><Emoji glyph={match[1]} size={64} /></div>
	{:else if mode === 'confirm' && incoming}
		{#key incoming}<ImportConfirm bundle={incoming} {language} onDone={confirmed} />{/key}
	{:else if mode === 'back'}
		<p>{s.done(dropped)}</p>
		<p>{s.back}</p>
		<div class="actions">
			<button type="button" class="primary" onclick={sendBack}>{s.sendBack}</button>
			<button type="button" onclick={() => { session?.leave(); mode = 'done'; }}>{s.skip}</button>
		</div>
	{:else if mode === 'sent'}
		<p>{s.sent}</p>
	{:else if mode === 'done'}
		<p>{s.done(dropped)}</p>
	{:else if mode === 'gone'}
		<p>{s.gone}</p>
	{:else}
		<p class="warn">{s.bad}</p>
	{/if}
	{#if mode === 'sent' || mode === 'done' || mode === 'none'}
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
	p {
		margin: 0;
		line-height: 1.5;
	}
	.warn {
		color: var(--red);
	}
	.match {
		display: flex;
		gap: 1rem;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
	}
	button,
	.go {
		font: inherit;
		padding: 0.5rem 1rem;
		border: 3px solid var(--ink);
		border-radius: 12px;
		background: var(--white);
		color: inherit;
		text-decoration: none;
		align-self: flex-start;
	}
	.primary,
	.go {
		background: var(--sun);
		font-weight: 700;
	}
</style>
