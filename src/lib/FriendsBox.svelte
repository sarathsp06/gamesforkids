<script lang="ts">
	/**
	 * Grown-ups: Paint Pot with others (design/presence, board 7b). The switch, off by default, with the honest
	 * cost beside it; adding a friend, with a six-digit code one device shows and the other types (or an invite
	 * link carrying it); the friends this device keeps.
	 */
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import Avatar from './Avatar.svelte';
	import { PAIR_DIGITS, isPairCode, newPairCode } from './presence';
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
	let mode = $state<'idle' | 'show' | 'enter' | 'waiting' | 'added' | 'closed'>('idle');
	let code = $state('');
	let typed = $state('');
	let copied = $state(false);
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
			enter: 'Enter a code',
			addHint: 'A friend is another family\'s device your child may paint with. One of you taps Add a friend, the other types the code it shows.',
			code: 'The friend\'s code',
			codeHint: 'On the friend\'s device: Grown-ups, Enter a code. Or send them the invite link.',
			copy: 'Copy invite link',
			copiedMsg: 'Link copied',
			typeHint: 'Type the code the other device shows.',
			addNow: 'Add',
			waiting: 'Finding the other device…',
			now: 'Friends now!',
			nowHint: 'Your child sees this friend with a heart in Paint Pot and can ask them to paint together.',
			closed: 'The code has expired, or the other device didn\'t answer. Make a new one.',
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
			enter: 'Voer een code in',
			addHint: 'Een vriendje is het apparaat van een ander gezin waarmee je kind mag schilderen. De een tikt op Voeg een vriendje toe, de ander typt de code die daar staat.',
			code: 'De code voor het vriendje',
			codeHint: 'Op het apparaat van het vriendje: Volwassenen, Voer een code in. Of stuur de uitnodigingslink.',
			copy: 'Kopieer uitnodigingslink',
			copiedMsg: 'Link gekopieerd',
			typeHint: 'Typ de code die het andere apparaat toont.',
			addNow: 'Voeg toe',
			waiting: 'Het andere apparaat zoeken…',
			now: 'Nu vriendjes!',
			nowHint: 'Je kind ziet dit vriendje met een hartje in Verfpot en kan vragen om samen te schilderen.',
			closed: 'De code is verlopen, of het andere apparaat antwoordde niet. Maak een nieuwe.',
			cancel: 'Annuleer',
			none: 'Nog geen vriendjes.',
			since: 'sinds',
			forget: 'Vergeet',
			confirmForget: 'Dit vriendje vergeten? Je kunt het later opnieuw toevoegen.'
		}
	};
	const s = $derived(T[language]);
	const myAvatar = () => (currentPlayer() ?? loadPlayers().list[0])?.avatar ?? 0;

	/** The invite link: the friend page on this site, the code after the #, which never leaves the browser. */
	function friendUrl(c: string) {
		const path = resolve('/friend');
		return `${location.origin}${path.endsWith('/') ? path : `${path}/`}#pair=${c}`;
	}
	const spaced = (c: string) => `${c.slice(0, 3)} ${c.slice(3)}`;

	/** Shows a new code (`c` absent), or joins the room of a code typed here. */
	async function start(c?: string) {
		close?.();
		added = null;
		copied = false;
		code = c ?? newPairCode();
		mode = c ? 'waiting' : 'show';
		close = await pair(
			code,
			myAvatar(),
			(h) => {
				if (mode !== 'show' && mode !== 'waiting') return;
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
				if (mode === 'show' || mode === 'waiting') mode = 'closed';
			}
		);
	}
	/** Digits only, at most six: a pasted "482 917" or "482-917" works too. */
	function typing(e: Event & { currentTarget: HTMLInputElement }) {
		typed = e.currentTarget.value.replace(/\D/g, '').slice(0, PAIR_DIGITS);
		e.currentTarget.value = typed;
	}
	async function copy() {
		try {
			await navigator.clipboard.writeText(friendUrl(code));
			copied = true;
		} catch {
			copied = false;
		}
	}
	function cancel() {
		close?.();
		close = null;
		added = null;
		typed = '';
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
		<div class="actions">
			<button type="button" class="primary" onclick={() => start()}>{s.add}</button>
			<button type="button" onclick={() => { typed = ''; mode = 'enter'; }}>{s.enter}</button>
		</div>
	{:else if mode === 'show'}
		<div class="panel">
			<span>{s.code}</span>
			<div class="digits" aria-label={spaced(code)}>
				{#each code.split('') as d, i (i)}<span class="digit" class:gap={i === 3}>{d}</span>{/each}
			</div>
			<span class="fine">{s.codeHint}</span>
			<button type="button" class="primary" onclick={copy}>{copied ? s.copiedMsg : s.copy}</button>
		</div>
		<div class="actions"><button type="button" onclick={cancel}>{s.cancel}</button></div>
	{:else if mode === 'enter' || mode === 'waiting'}
		<div class="panel">
			<span>{mode === 'enter' ? s.typeHint : s.waiting}</span>
			<!-- One real input under six boxes, so typing, pasting and the phone's number pad all just work. -->
			<label class="entry">
				<input
					type="text"
					inputmode="numeric"
					autocomplete="one-time-code"
					aria-label={s.enter}
					disabled={mode === 'waiting'}
					value={typed}
					oninput={typing}
					onkeydown={(e) => e.key === 'Enter' && isPairCode(typed) && start(typed)}
				/>
				<span class="digits" aria-hidden="true">
					{#each Array.from({ length: PAIR_DIGITS }, (_, i) => i) as i (i)}<span class="digit small" class:gap={i === 3} class:now={i === typed.length && mode === 'enter'}>{typed[i] ?? ''}</span>{/each}
				</span>
			</label>
			{#if mode === 'enter'}<button type="button" class="primary" disabled={!isPairCode(typed)} onclick={() => start(typed)}>{s.addNow}</button>{/if}
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
	.panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
		padding: 1rem;
		border-radius: 16px;
		background: var(--sky);
		text-align: center;
	}
	.digits {
		display: flex;
		gap: 0.35rem;
	}
	.digit {
		width: 2.75rem;
		height: 3.6rem;
		display: grid;
		place-items: center;
		border: 3px solid var(--ink);
		border-radius: 12px;
		background: var(--white);
		font-family: var(--title);
		font-size: 2.1rem;
		font-weight: 700;
	}
	.digit.small {
		width: 2.2rem;
		height: 2.9rem;
		font-size: 1.6rem;
	}
	.digit.gap {
		margin-left: 0.6rem;
	}
	.digit.now {
		border-color: var(--blue);
		box-shadow: 0 0 0 3px var(--sun);
	}
	.entry {
		position: relative;
		cursor: text;
	}
	/* The real input covers the boxes, invisible, so a tap anywhere on them focuses it. */
	.entry input {
		position: absolute;
		inset: 0;
		width: 100%;
		opacity: 0;
		font-size: 16px;
	}
	.entry:focus-within .digit.now {
		background: var(--butter);
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
