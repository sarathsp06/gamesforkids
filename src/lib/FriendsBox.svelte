<script lang="ts">
	/**
	 * Grown-ups: Paint Pot with others (design/presence). The switch, off by default, with the honest cost
	 * beside it; pairing two devices as friends with four pictures; the friends this device remembers.
	 */
	import { onDestroy } from 'svelte';
	import Avatar from './Avatar.svelte';
	import Emoji from './Emoji.svelte';
	import { CODE_LENGTH, CODE_PICTURES, newCode, type Hello } from './presence';
	import { addFriend, forgetFriend, loadFriends, type Friend } from './presence.svelte';
	import { pair } from './pairing';
	import { currentPlayer, loadPlayers } from './storage';
	import type { Language } from './words';

	let { language, online, onOnline }: { language: Language; online: boolean; onOnline: (on: boolean) => void } = $props();

	let friends = $state<Friend[]>(loadFriends().list);
	let mode = $state<'idle' | 'show' | 'enter' | 'waiting' | 'found' | 'added' | 'closed'>('idle');
	let code = $state<number[]>([]);
	let found = $state<Hello | null>(null);
	let close: (() => void) | null = null;

	const T = {
		en: {
			title: 'Play with others',
			online: 'Play with others online, in Paint Pot',
			note: 'Shows your child that other children are painting, and lets them see pictures others finished. Painting with a friend you paired below needs this too.',
			cost: 'Devices connect directly, so other devices online can see this device\'s internet address. Nothing else is shared: no name, no photo, nothing typed; a finished picture travels only as one colour per area of the outline.',
			pair: 'Pair with a friend',
			pairHint: 'A friend is another family\'s device your child may paint with. Do this together with the other grown-up: one shows a code, the other taps the same four pictures.',
			show: 'Show a code',
			enter: 'Enter a code',
			showHint: 'Tap these four pictures, in this order, on the other device.',
			enterHint: 'Tap the four pictures the other device shows, in order.',
			waiting: 'Looking for the other device… This stays open for ten minutes.',
			found: 'This device wants to be friends. Is this the face the other device shows?',
			add: 'Add this friend',
			notThis: 'Not this one',
			added: 'Friends now. Your child sees this friend with a heart in Paint Pot, and can ask them to paint together.',
			closed: 'The code has expired. Make a new one.',
			cancel: 'Cancel',
			undo: 'Undo',
			friends: 'Friends on this device',
			none: 'No friends yet.',
			since: 'since',
			forget: 'Forget',
			confirmForget: 'Forget this friend? You can pair again later.'
		},
		nl: {
			title: 'Samen met anderen',
			online: 'Online samen met anderen, in Verfpot',
			note: 'Laat je kind zien dat andere kinderen aan het schilderen zijn, en toont tekeningen die anderen afmaakten. Samen schilderen met een vriendje dat je hieronder koppelt, heeft dit ook nodig.',
			cost: 'Apparaten maken rechtstreeks verbinding, dus andere apparaten online kunnen het internetadres van dit apparaat zien. Verder wordt niets gedeeld: geen naam, geen foto, niets getypt; een afgemaakte tekening gaat alleen als één kleur per vlak van de omtrek.',
			pair: 'Koppel een vriendje',
			pairHint: 'Een vriendje is het apparaat van een ander gezin waarmee je kind mag schilderen. Doe dit samen met de andere volwassene: de een toont een code, de ander tikt dezelfde vier plaatjes.',
			show: 'Toon een code',
			enter: 'Voer een code in',
			showHint: 'Tik deze vier plaatjes, in deze volgorde, op het andere apparaat.',
			enterHint: 'Tik de vier plaatjes die het andere apparaat toont, op volgorde.',
			waiting: 'Op zoek naar het andere apparaat… Dit blijft tien minuten open.',
			found: 'Dit apparaat wil vriendjes worden. Is dit het gezichtje dat het andere apparaat toont?',
			add: 'Voeg dit vriendje toe',
			notThis: 'Niet dit',
			added: 'Nu vriendjes. Je kind ziet dit vriendje met een hartje in Verfpot en kan vragen om samen te schilderen.',
			closed: 'De code is verlopen. Maak een nieuwe.',
			cancel: 'Annuleer',
			undo: 'Terug',
			friends: 'Vriendjes op dit apparaat',
			none: 'Nog geen vriendjes.',
			since: 'sinds',
			forget: 'Vergeet',
			confirmForget: 'Dit vriendje vergeten? Je kunt later opnieuw koppelen.'
		}
	};
	const s = $derived(T[language]);
	const myAvatar = () => (currentPlayer() ?? loadPlayers().list[0])?.avatar ?? 0;

	async function start(c: number[]) {
		code = c;
		found = null;
		close?.();
		close = await pair(
			c,
			myAvatar(),
			(h) => {
				if (mode === 'added') return;
				found = h;
				mode = 'found';
			},
			() => {
				if (mode === 'show' || mode === 'waiting') mode = 'closed';
			}
		);
	}
	function show() {
		mode = 'show';
		void start(newCode());
	}
	function tap(i: number) {
		if (code.length >= CODE_LENGTH) return;
		code = [...code, i];
		if (code.length === CODE_LENGTH) {
			mode = 'waiting';
			void start(code);
		}
	}
	function accept() {
		if (!found) return;
		addFriend(found.key, found.avatar);
		friends = loadFriends().list;
		mode = 'added';
		close?.();
		close = null;
	}
	function cancel() {
		close?.();
		close = null;
		code = [];
		found = null;
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

	<h3>{s.pair}</h3>
	{#if mode === 'idle'}
		<span class="fine">{s.pairHint}</span>
		<div class="actions">
			<button type="button" onclick={show}>{s.show}</button>
			<button type="button" onclick={() => { code = []; mode = 'enter'; }}>{s.enter}</button>
		</div>
	{:else if mode === 'show'}
		<span class="fine">{s.showHint}</span>
		<div class="code" aria-label="Pair code">
			{#each code as i, n (n)}<span class="pic"><Emoji glyph={CODE_PICTURES[i]} size={52} /></span>{/each}
		</div>
		<span class="fine">{s.waiting}</span>
		<div class="actions"><button type="button" onclick={cancel}>{s.cancel}</button></div>
	{:else if mode === 'enter' || mode === 'waiting'}
		<span class="fine">{mode === 'enter' ? s.enterHint : s.waiting}</span>
		<div class="code" aria-label="Pair code">
			{#each Array.from({ length: CODE_LENGTH }, (_, n) => n) as n (n)}
				<span class="pic slot">{#if code[n] !== undefined}<Emoji glyph={CODE_PICTURES[code[n]]} size={52} />{/if}</span>
			{/each}
		</div>
		{#if mode === 'enter'}
			<div class="keys" role="group" aria-label="Pictures">
				{#each CODE_PICTURES as g, i (g)}
					<button type="button" class="key" onclick={() => tap(i)}><Emoji glyph={g} size={36} /></button>
				{/each}
			</div>
		{/if}
		<div class="actions">
			{#if mode === 'enter' && code.length}<button type="button" onclick={() => (code = code.slice(0, -1))}>{s.undo}</button>{/if}
			<button type="button" onclick={cancel}>{s.cancel}</button>
		</div>
	{:else if mode === 'found' && found}
		<span class="fine">{s.found}</span>
		<div class="found"><Avatar avatar={found.avatar} size={64} /></div>
		<div class="actions">
			<button type="button" class="primary" onclick={accept}>{s.add}</button>
			<button type="button" onclick={() => { found = null; mode = code.length && close ? 'waiting' : 'idle'; }}>{s.notThis}</button>
		</div>
	{:else if mode === 'added'}
		<span class="fine">{s.added}</span>
		<div class="actions"><button type="button" onclick={cancel}>OK</button></div>
	{:else}
		<span class="fine">{s.closed}</span>
		<div class="actions"><button type="button" onclick={cancel}>OK</button></div>
	{/if}

	<h3>{s.friends}</h3>
	{#if friends.length}
		{#each friends as f (f.key)}
			<div class="friend">
				<Avatar avatar={f.avatar} size={34} />
				<span class="who">{s.since} {date(f.added)}</span>
				<button type="button" onclick={() => forget(f.key)}>{s.forget}</button>
			</div>
		{/each}
	{:else}
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
	.code {
		display: flex;
		gap: 0.6rem;
	}
	.pic {
		width: 68px;
		height: 68px;
		display: grid;
		place-items: center;
		border: 3px solid var(--ink);
		border-radius: 16px;
		background: var(--paper);
	}
	.slot {
		border-style: dashed;
	}
	.keys {
		display: grid;
		grid-template-columns: repeat(8, minmax(0, 1fr));
		gap: 0.4rem;
	}
	.key {
		aspect-ratio: 1;
		display: grid;
		place-items: center;
		padding: 0.2rem;
	}
	.friend {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.who {
		flex: 1;
	}
	@media (max-width: 640px) {
		.keys {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}
</style>
