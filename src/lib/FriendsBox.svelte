<script lang="ts">
	/**
	 * Grown-ups: Paint Pot with others (design/presence, board 7b). The switch, off by default, with the honest
	 * cost beside it; one way to add a friend, a QR code the other device scans; the friends this device keeps.
	 */
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import Avatar from './Avatar.svelte';
	import { newKey } from './presence';
	import { addFriend, forgetFriend, loadFriends, type Friend } from './presence.svelte';
	import { pair } from './pairing';
	import { currentPlayer, loadPlayers } from './storage';
	import type { Language } from './words';

	let {
		language,
		online,
		onOnline,
		onAdded
	}: { language: Language; online: boolean; onOnline: (on: boolean) => void; onAdded?: (f: Friend) => void } = $props();

	let friends = $state<Friend[]>(loadFriends().list);
	let mode = $state<'idle' | 'qr' | 'added' | 'closed'>('idle');
	let qr = $state('');
	let added = $state<Friend | null>(null);
	let close: (() => void) | null = null;

	const T = {
		en: {
			title: 'Play with others',
			online: 'Play with others online, in Paint Pot',
			note: 'Shows your child that other children are painting, and lets them see pictures others finished. Painting with a friend needs this too.',
			cost: 'Messages go through public relay servers, encrypted, so only devices in the same game can read them. Other devices never learn this device\'s internet address; the relays see it, as any website does. Nothing else is shared: no name, no photo, nothing typed; a finished picture travels only as one colour per area of the outline.',
			friends: 'Friends',
			add: 'Add a friend',
			addHint: 'A friend is another family\'s device your child may paint with. Do this together with the other grown-up.',
			scan: 'Scan this with the friend\'s device camera. Both become friends at once.',
			now: 'Friends now!',
			nowHint: 'Your child sees this friend with a heart in Paint Pot and can ask them to paint together.',
			closed: 'The code has expired. Make a new one.',
			cancel: 'Cancel',
			none: 'No friends yet.',
			since: 'since',
			forget: 'Forget',
			confirmForget: 'Forget this friend? You can add them again later.'
		},
		nl: {
			title: 'Samen met anderen',
			online: 'Online samen met anderen, in Verfpot',
			note: 'Laat je kind zien dat andere kinderen aan het schilderen zijn, en toont tekeningen die anderen afmaakten. Samen schilderen met een vriendje heeft dit ook nodig.',
			cost: 'Berichten gaan versleuteld via openbare relay-servers, zodat alleen apparaten in hetzelfde spel ze kunnen lezen. Andere apparaten krijgen het internetadres van dit apparaat nooit te zien; de relays wel, zoals elke website. Verder wordt niets gedeeld: geen naam, geen foto, niets getypt; een afgemaakte tekening gaat alleen als één kleur per vlak van de omtrek.',
			friends: 'Vriendjes',
			add: 'Voeg een vriendje toe',
			addHint: 'Een vriendje is het apparaat van een ander gezin waarmee je kind mag schilderen. Doe dit samen met de andere volwassene.',
			scan: 'Scan dit met de camera van het apparaat van het vriendje. Dan zijn ze meteen allebei vriendjes.',
			now: 'Nu vriendjes!',
			nowHint: 'Je kind ziet dit vriendje met een hartje in Verfpot en kan vragen om samen te schilderen.',
			closed: 'De code is verlopen. Maak een nieuwe.',
			cancel: 'Annuleer',
			none: 'Nog geen vriendjes.',
			since: 'sinds',
			forget: 'Vergeet',
			confirmForget: 'Dit vriendje vergeten? Je kunt het later opnieuw toevoegen.'
		}
	};
	const s = $derived(T[language]);
	const myAvatar = () => (currentPlayer() ?? loadPlayers().list[0])?.avatar ?? 0;

	/** The friend page's address on this site; the one-time key goes after the #, which never leaves the browser. */
	function friendUrl(key: string) {
		const path = resolve('/friend');
		return `${location.origin}${path.endsWith('/') ? path : `${path}/`}#pair=${key}`;
	}

	async function start() {
		close?.();
		added = null;
		const key = newKey();
		const QR = await import('qrcode');
		qr = await QR.toString(friendUrl(key), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
		mode = 'qr';
		close = await pair(
			key,
			myAvatar(),
			(h) => {
				if (mode !== 'qr') return;
				addFriend(h.key, h.avatar);
				friends = loadFriends().list;
				added = friends.find((f) => f.key === h.key) ?? null;
				// Painting with a friend needs the switch: adding one is the grown-up saying yes to it.
				if (!online) onOnline(true);
				if (added) onAdded?.(added);
				mode = 'added';
				// Leave the room a moment later, so this device's hello surely reaches the other one.
				const c = close;
				close = null;
				setTimeout(() => c?.(), 3000);
			},
			() => {
				if (mode === 'qr') mode = 'closed';
			}
		);
	}
	function cancel() {
		close?.();
		close = null;
		added = null;
		mode = 'idle';
	}
	function forget(key: string) {
		if (!confirm(s.confirmForget)) return;
		forgetFriend(key);
		friends = loadFriends().list;
	}
	onDestroy(() => close?.());
	const date = (iso: string) => new Date(iso).toLocaleDateString(language === 'nl' ? 'nl' : 'en', { day: 'numeric', month: 'short' });
</script>

<section class="box">
	<h2>{s.title}</h2>
	<label class="row"><span>{s.online}</span><input type="checkbox" checked={online} onchange={(e) => onOnline(e.currentTarget.checked)} /></label>
	<span class="fine">{s.note}</span>
	<span class="fine cost">{s.cost}</span>

	<h3>{s.friends}</h3>
	{#if mode === 'idle'}
		<span class="fine">{s.addHint}</span>
		<div class="actions"><button type="button" class="primary" onclick={start}>{s.add}</button></div>
	{:else if mode === 'qr'}
		<div class="scan">
			<div class="qr" aria-label="QR code">{@html qr}</div>
			<span>{s.scan}</span>
		</div>
		<div class="actions"><button type="button" onclick={cancel}>{s.cancel}</button></div>
	{:else if mode === 'added' && added}
		<div class="now">
			<div class="faces">
				<Avatar avatar={myAvatar()} size={64} />
				<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z" /></svg>
				<Avatar avatar={added.avatar} size={64} />
			</div>
			<strong>{s.now}</strong>
			<span class="fine">{s.nowHint}</span>
		</div>
		<div class="actions"><button type="button" onclick={cancel}>OK</button></div>
	{:else}
		<span class="fine">{s.closed}</span>
		<div class="actions"><button type="button" onclick={cancel}>OK</button></div>
	{/if}

	{#if friends.length}
		{#each friends as f (f.key)}
			<div class="friend">
				<Avatar avatar={f.avatar} size={34} />
				<span class="who">{s.since} {date(f.added)}</span>
				<button type="button" onclick={() => forget(f.key)}>{s.forget}</button>
			</div>
		{/each}
	{:else if mode === 'idle'}
		<span class="fine">{s.none}</span>
	{/if}
</section>

<style>
	.box {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 1rem 1.1rem;
		border: 3px solid var(--ink);
		border-radius: 20px;
		background: var(--white);
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	h3 {
		margin: 0.4rem 0 0;
		font-size: 1rem;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
	}
	.row input {
		width: 22px;
		height: 22px;
		flex: none;
	}
	.fine {
		font-size: 0.9rem;
		color: var(--mute);
		line-height: 1.4;
	}
	.cost {
		padding: 0.5rem 0.7rem;
		border-radius: 12px;
		background: var(--butter);
		color: var(--ink);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	button {
		font: inherit;
		font-size: 0.9rem;
		padding: 0.3rem 0.8rem;
		border: 2px solid var(--ink);
		border-radius: 10px;
		background: var(--white);
	}
	.primary {
		background: var(--sun);
		font-weight: 700;
	}
	.scan {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		padding: 1rem;
		border-radius: 16px;
		background: var(--sky);
		text-align: center;
	}
	.qr {
		width: min(240px, 70vw);
		background: var(--white);
	}
	.qr :global(svg) {
		display: block;
		width: 100%;
		height: auto;
	}
	.now {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		border-radius: 16px;
		background: var(--mint);
		text-align: center;
	}
	.faces {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.heart {
		width: 36px;
		height: 36px;
		fill: var(--red);
		stroke: var(--ink);
		stroke-width: 1.6;
	}
	.friend {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.who {
		flex: 1;
	}
</style>
