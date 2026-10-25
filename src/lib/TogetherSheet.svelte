<script lang="ts">
	/**
	 * Paint with a friend, from inside Paint Pot (design/presence). The child sees their friends: the ones
	 * painting now can be tapped to invite. A grown-up reads, in two numbered steps, how to add a friend,
	 * and sets it up right here behind the same three-second hold as the gear, without leaving the game.
	 */
	import Avatar from './Avatar.svelte';
	import FriendsBox from './FriendsBox.svelte';
	import GearHold from './GearHold.svelte';
	import Icon from './Icon.svelte';
	import { loadFriends, type Friend } from './presence.svelte';
	import type { Language } from './words';

	let {
		language,
		online,
		live,
		onOnline,
		onInvite,
		onAdded
	}: {
		language: Language;
		/** The grown-ups switch "Play with others online". */
		online: boolean;
		/** Remembered friends in Paint Pot right now, by friend key. */
		live: Record<string, number>;
		onOnline: (on: boolean) => void;
		onInvite: (key: string) => void;
		onAdded: (f: Friend) => void;
	} = $props();

	let dialog: HTMLDialogElement;
	let friends = $state<Friend[]>([]);
	let unlocked = $state(false);

	export function open() {
		friends = loadFriends().list;
		unlocked = false;
		dialog.showModal();
	}
	const close = () => dialog.close();

	const T = {
		en: {
			title: 'Paint with a friend',
			close: 'Close',
			here: 'Painting now',
			invite: 'Paint together',
			notHere: 'Not in Paint Pot right now',
			off: 'Turn on "Play with others online" below to see when your friends are here.',
			grownup: 'For a grown-up',
			intro: 'Your child can paint side by side with a friend on another family\'s device. Set it up once, together with the other grown-up:',
			steps: [
				'Hold the button below for three seconds.',
				'Tap "Add a friend" and scan the QR code with the other device\'s camera.'
			],
			after: 'After that, no code is needed: when the friend opens Paint Pot, their face shows here with a heart, and your child taps it to paint together.',
			more: 'Pair another friend, or change this: hold the button for three seconds.',
			hold: 'Grown-ups: hold for three seconds to set up painting with a friend',
			holdShort: 'Hold for three seconds'
		},
		nl: {
			title: 'Samen schilderen met een vriendje',
			close: 'Sluiten',
			here: 'Schildert nu',
			invite: 'Samen schilderen',
			notHere: 'Nu niet in Verfpot',
			off: 'Zet hieronder "Online samen met anderen" aan om te zien wanneer je vriendjes er zijn.',
			grownup: 'Voor een volwassene',
			intro: 'Je kind kan naast een vriendje schilderen, op het apparaat van een ander gezin. Stel het één keer in, samen met de andere volwassene:',
			steps: [
				'Houd de knop hieronder drie seconden vast.',
				'Tik op "Voeg een vriendje toe" en scan de QR-code met de camera van het andere apparaat.'
			],
			after: 'Daarna is er geen code meer nodig: als het vriendje Verfpot opent, staat zijn gezichtje hier met een hartje, en je kind tikt erop om samen te schilderen.',
			more: 'Nog een vriendje koppelen, of dit aanpassen: houd de knop drie seconden vast.',
			hold: 'Volwassenen: drie seconden vasthouden om samen schilderen in te stellen',
			holdShort: 'Drie seconden vasthouden'
		}
	};
	const s = $derived(T[language]);
	const ready = $derived(online && friends.length > 0);
</script>

<dialog bind:this={dialog} aria-labelledby="together-title">
	<header>
		<h2 id="together-title"><Icon name="friends" size={30} /> {s.title}</h2>
		<button type="button" class="close" aria-label={s.close} onclick={close}><Icon name="close" size={28} /></button>
	</header>

	{#if friends.length}
		<ul class="friends">
			{#each friends as f (f.key)}
				{@const here = online && f.key in live}
				<li class:here>
					<span class="face"><Avatar avatar={live[f.key] ?? f.avatar} size="100%" /><svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3.1 1.8-2 3.3-3.1 5.4-3.1 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" /></svg></span>
					{#if here}
						<span class="status">{s.here}</span>
						<button type="button" class="invite" onclick={() => { close(); onInvite(f.key); }}><Icon name="play" size={28} /> {s.invite}</button>
					{:else}
						<span class="status">{s.notHere}</span>
					{/if}
				</li>
			{/each}
		</ul>
		{#if !online}<p class="note warn">{s.off}</p>{/if}
	{/if}

	<section class="grownup" class:split={friends.length > 0}>
		<h3>{s.grownup}</h3>
		{#if unlocked}
			<FriendsBox
				{language}
				{online}
				{onOnline}
				onAdded={(f) => {
					friends = loadFriends().list;
					onAdded(f);
				}}
			/>
		{:else}
			{#if ready}
				<p class="note">{s.more}</p>
			{:else}
				<p class="note">{s.intro}</p>
				<ol>
					{#each s.steps as step, i (i)}<li>{step}</li>{/each}
				</ol>
				<p class="note">{s.after}</p>
			{/if}
			<div class="hold"><GearHold size={72} icon="friends" label={s.hold} onHeld={() => (unlocked = true)} /><span class="caption">{s.holdShort}</span></div>
		{/if}
	</section>
</dialog>

<style>
	dialog {
		width: min(36rem, 94vw);
		max-height: 92dvh;
		border: var(--line) solid var(--ink);
		border-radius: 24px;
		padding: 1rem 1.25rem 1.5rem;
		background: var(--paper);
		color: var(--ink);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		font-family: var(--title);
		font-size: 1.4rem;
	}
	h3 {
		margin: 0 0 0.4rem;
		font-size: 1.05rem;
	}
	.close {
		flex: none;
		width: 3rem;
		height: 3rem;
		display: grid;
		place-items: center;
		border: 3px solid var(--ink);
		border-radius: 50%;
		background: var(--white);
	}
	.friends {
		list-style: none;
		margin: 1rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
	}
	.friends li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.5rem 0.7rem;
		border: 3px solid var(--ink);
		border-radius: 18px;
		background: var(--white);
		opacity: 0.6;
	}
	.friends li.here {
		opacity: 1;
		background: var(--butter);
	}
	.face {
		position: relative;
		flex: none;
		width: 56px;
		height: 56px;
	}
	.heart {
		position: absolute;
		right: -4px;
		bottom: -2px;
		width: 22px;
		height: 22px;
		fill: var(--red);
		stroke: var(--ink);
		stroke-width: 2;
	}
	.status {
		flex: 1;
		font-weight: 700;
	}
	.invite {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.4rem 0.9rem;
		border: 3px solid var(--ink);
		border-radius: 14px;
		background: var(--sun);
		box-shadow: 0 4px 0 var(--ink);
		font: inherit;
		font-weight: 700;
	}
	.invite:active {
		transform: translateY(4px);
		box-shadow: none;
	}
	.grownup {
		margin-top: 1rem;
	}
	.grownup.split {
		margin-top: 1.2rem;
		padding-top: 1rem;
		border-top: 2px dashed var(--ink);
	}
	.note {
		margin: 0.3rem 0;
		font-size: 0.95rem;
		line-height: 1.45;
	}
	.warn {
		margin-top: 0.7rem;
		padding: 0.5rem 0.7rem;
		border-radius: 12px;
		background: var(--butter);
	}
	ol {
		margin: 0.4rem 0;
		padding-left: 1.4rem;
		line-height: 1.5;
	}
	ol li {
		margin: 0.25rem 0;
	}
	.hold {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		margin-top: 1rem;
	}
	.caption {
		font-size: 0.9rem;
		font-weight: 700;
	}
</style>
