<script lang="ts">
	/**
	 * Before progress from another device is taken in: who is coming, which of them are a child already here,
	 * and one Yes. Nothing changes until then, and taking it in is always a merge (design/progress-transfer).
	 */
	import { untrack } from 'svelte';
	import Avatar from './Avatar.svelte';
	import { loadPlayers } from './storage';
	import { lookalikes, takeIn, type Bundle } from './transfer';
	import type { Language } from './words';

	let { bundle, language, onDone }: { bundle: Bundle; language: Language; onDone: (taken: boolean, droppedPictures: number) => void } = $props();

	const here = loadPlayers().list;
	// Worked out once per bundle: the page shows a new confirmation for a new bundle.
	const twins = untrack(() => lookalikes(bundle, here));
	/** Incoming id → local id, for each "same child" the grown-up keeps ticked. */
	let same = $state<Record<string, string>>({ ...twins });
	let withSettings = $state(false);
	const isNew = here.length === 0;

	const T = {
		en: {
			title: 'Take in progress from another device?',
			who: 'Coming over:',
			same: (n: string) => `Same child as ${n} here`,
			stickers: (n: number) => (n === 1 ? '1 sticker' : `${n} stickers`),
			pictures: (n: number) => (n === 1 ? '1 picture' : `${n} pictures`),
			noPictures: 'No pictures come with this; they stay where they are.',
			settings: 'Also take its settings (voice, sounds, clock)',
			merge: 'Nothing on this device is lost: players and stickers are added, the higher level wins.',
			yes: 'Yes, add it',
			no: 'No'
		},
		nl: {
			title: 'Voortgang van een ander apparaat overnemen?',
			who: 'Komt erbij:',
			same: (n: string) => `Hetzelfde kind als ${n} hier`,
			stickers: (n: number) => (n === 1 ? '1 sticker' : `${n} stickers`),
			pictures: (n: number) => (n === 1 ? '1 tekening' : `${n} tekeningen`),
			noPictures: 'Hier komen geen tekeningen mee; die blijven waar ze zijn.',
			settings: 'Ook de instellingen overnemen (stem, geluiden, klok)',
			merge: 'Op dit apparaat gaat niets verloren: spelers en stickers komen erbij, het hoogste niveau telt.',
			yes: 'Ja, toevoegen',
			no: 'Nee'
		}
	};
	const s = $derived(T[language]);
	const nameOf = (id: string) => here.find((p) => p.id === id)?.name ?? '';

	function yes() {
		const pairs = Object.fromEntries(Object.entries(same).filter(([, v]) => v));
		const { droppedPictures } = takeIn(bundle, pairs, withSettings);
		onDone(true, droppedPictures);
	}
</script>

<section class="confirm" aria-labelledby="confirm-title">
	<h2 id="confirm-title">{s.title}</h2>
	<span class="fine">{s.who}</span>
	<ul>
		{#each bundle.players as p (p.id)}
			<li>
				<Avatar avatar={p.avatar} size={44} />
				<span class="who">{p.name} · {s.stickers(bundle.stickers[p.id]?.length ?? 0)}</span>
				{#if twins[p.id]}
					<label class="fine">
						<input type="checkbox" checked={!!same[p.id]} onchange={(e) => (same = { ...same, [p.id]: e.currentTarget.checked ? twins[p.id] : '' })} />
						{s.same(nameOf(twins[p.id]))}
					</label>
				{/if}
			</li>
		{/each}
	</ul>
	<span class="fine">{bundle.gallery.length ? s.pictures(bundle.gallery.length) : s.noPictures}</span>
	{#if bundle.settings && !isNew}
		<label class="fine"><input type="checkbox" bind:checked={withSettings} /> {s.settings}</label>
	{/if}
	<span class="fine">{s.merge}</span>
	<div class="actions">
		<button type="button" class="primary" onclick={yes}>{s.yes}</button>
		<button type="button" onclick={() => onDone(false, 0)}>{s.no}</button>
	</div>
</section>

<style>
	.confirm {
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
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	li {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	.fine {
		font-size: 0.9rem;
		color: var(--mute);
		line-height: 1.4;
	}
	.actions {
		display: flex;
		gap: 0.6rem;
	}
	button {
		font: inherit;
		padding: 0.4rem 1rem;
		border: 2px solid var(--ink);
		border-radius: 10px;
		background: var(--white);
	}
	.primary {
		background: var(--sun);
		font-weight: 700;
	}
</style>
