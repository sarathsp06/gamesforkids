<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Pip from '#lib/Pip.svelte';
	import Avatar from '#lib/Avatar.svelte';
	import Icon from '#lib/Icon.svelte';
	import GearHold from '#lib/GearHold.svelte';
	import { speak, stopSpeech, unlockSpeech } from '#lib/audio.ts';
	import { t } from '#lib/i18n.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import { AVATARS, MAX_AGE, MIN_AGE, newId, type Player } from '#lib/players.ts';
	import { loadLanguage, loadPlayers, saveLanguage, savePlayers, type Players } from '#lib/storage.ts';
	import { levelOf } from '#lib/levels.ts';

	let language = $state<Language>('en');
	let players = $state<Players>({ v: 1, list: [], current: null });
	let adding = $state(false);
	let draft = $state<Player>({ id: '', name: '', avatar: 0, age: 4 });
	let greeted = $state(false);

	onMount(() => {
		language = loadLanguage();
		players = loadPlayers();
		if (!players.list.length) startAdd();
		return stopSpeech;
	});

	const NOTE = {
		en: 'A player is a picture and a name, kept on this device only. Age sets Little or Big mode. Progress and stickers belong to the player.',
		nl: 'Een speler is een plaatje en een naam, alleen op dit apparaat. De leeftijd kiest de kleine of grote stand. Voortgang en stickers horen bij de speler.'
	};
	const DOT_GAMES = ['spell', 'shapes', 'paint', 'letters'];
	/** Four dots: the games this device has gone past the first level in. Progress is per device for now. */
	const played = () => DOT_GAMES.map((g) => levelOf(g).at > 1);

	function choose(p: Player) {
		players = { ...players, current: p.id };
		savePlayers(players);
		unlockSpeech();
		goto(resolve('/home'));
	}

	function startAdd() {
		draft = { id: newId(), name: '', avatar: players.list.length % AVATARS.length, age: 4 };
		adding = true;
	}

	function saveDraft() {
		const name = draft.name.trim() || (language === 'nl' ? 'Ik' : 'Me');
		const p = { ...draft, name };
		players = { v: 1, list: [...players.list, p], current: p.id };
		savePlayers(players);
		adding = false;
		choose(p);
	}
</script>

<main>
	<div class="top">
		<Pip line={t(language, 'home.who')} {language} autoSay={greeted} />
		<button type="button" class="round" aria-label="Hear it again" onclick={() => { greeted = true; speak(t(language, 'home.who'), language); }}>
			<Icon name="speaker" size={36} />
		</button>
	</div>

	{#if adding}
		<section class="new" aria-label="New player">
			<div class="faces" role="group" aria-label="Pick a face">
				{#each AVATARS as _, i (i)}
					<button type="button" class="face" aria-label="Face {i + 1}" aria-pressed={draft.avatar === i} onclick={() => (draft.avatar = i)}>
						<Avatar avatar={i} size={88} />
					</button>
				{/each}
			</div>
			<div class="ages" role="group" aria-label="Age">
				{#each Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => i + MIN_AGE) as a (a)}
					<button type="button" class="age" aria-label="Age {a}" aria-pressed={draft.age === a} onclick={() => (draft.age = a)}>{a}</button>
				{/each}
			</div>
			<div class="name">
				<input type="text" maxlength="14" placeholder={language === 'nl' ? 'Naam (door een volwassene)' : 'Name (a grown-up types it)'} bind:value={draft.name} aria-label="Name" />
				<button type="button" class="go" aria-label="Done" onclick={saveDraft}><Icon name="check" size={40} /></button>
				{#if players.list.length}
					<button type="button" class="round" aria-label="Cancel" onclick={() => (adding = false)}><Icon name="close" size={28} /></button>
				{/if}
			</div>
		</section>
	{:else}
		<section class="players">
			{#each players.list as p, i (p.id)}
				{@const dots = played()}
				<button type="button" class="card c{i % 4}" aria-label="{p.name}, age {p.age}" onclick={() => choose(p)}>
					<Avatar avatar={p.avatar} size={150} />
					<span class="pname">{p.name}</span>
					<span class="dots" aria-hidden="true">
						{#each dots as on, j (j)}<i class:on></i>{/each}
					</span>
				</button>
			{/each}
			<button type="button" class="card add" aria-label="Add a new player" onclick={startAdd}>
				<Icon name="plus" size={110} />
				<span class="pname faint">{language === 'nl' ? 'Nieuw' : 'New'}</span>
			</button>
		</section>
	{/if}

	<footer>
		<div class="flags" role="group" aria-label="Language">
			{#each LANGUAGES as l (l.id)}
				<button
					type="button"
					class="round flag"
					aria-label={l.name}
					aria-pressed={language === l.id}
					onclick={() => {
						language = l.id;
						saveLanguage(l.id);
						speak(t(l.id, 'lang.name'), l.id);
					}}><Icon name={l.id} size={34} /></button
				>
			{/each}
		</div>
		<p class="note">{NOTE[language]}</p>
		<GearHold />
	</footer>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1.5rem, 4vh, 2.4rem);
		padding: 2.2rem 3rem 2.5rem;
	}
	.top {
		display: flex;
		align-items: center;
		gap: 1.2rem;
		width: 100%;
		max-width: 56rem;
	}
	.top :global(.pip) {
		flex: 1;
	}
	.top :global(.bubble) {
		flex: 1;
	}
	.round,
	.card,
	.face,
	.age,
	.go {
		border: var(--line) solid var(--ink);
		background: var(--white);
		box-shadow: 0 6px 0 var(--ink);
		color: var(--ink);
		transition: transform 120ms, box-shadow 120ms;
	}
	.round:active,
	.card:active,
	.face:active,
	.age:active,
	.go:active {
		transform: translateY(6px);
		box-shadow: none;
	}
	.round {
		width: var(--tap);
		height: var(--tap);
		min-width: 4rem;
		min-height: 4rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		padding: 0;
		flex: none;
	}
	.flag[aria-pressed='true'] {
		box-shadow: 0 6px 0 var(--ink), 0 0 0 6px var(--ink);
	}
	.players {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(14rem, 100%), 1fr));
		gap: 2rem;
		width: 100%;
		max-width: 52rem;
		margin-top: 0.5rem;
	}
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		padding: 1.6rem 1rem 1.4rem;
		border-radius: 32px;
		box-shadow: 0 8px 0 var(--ink);
	}
	.card:active {
		transform: translateY(8px);
	}
	.card.c0 {
		background: var(--sky);
	}
	.card.c1 {
		background: var(--butter);
	}
	.card.c2 {
		background: var(--blush);
	}
	.card.c3 {
		background: var(--mint);
	}
	.card.add {
		border-style: dashed;
		box-shadow: none;
		justify-content: center;
	}
	.card.add:active {
		transform: none;
	}
	.pname {
		font-family: var(--title);
		font-weight: 700;
		font-size: 1.9rem;
	}
	.faint {
		font-weight: 500;
		font-size: 1.4rem;
		color: var(--mute);
	}
	.dots {
		display: flex;
		gap: 6px;
	}
	.dots i {
		width: 18px;
		height: 18px;
		border: 3px solid var(--ink);
		border-radius: 50%;
		background: var(--white);
	}
	.dots i.on {
		background: var(--sun);
	}
	.new {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.4rem;
		width: 100%;
		max-width: 52rem;
	}
	.faces,
	.ages {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}
	.face {
		padding: 0.4rem;
		border-radius: 28px;
		line-height: 0;
	}
	.face[aria-pressed='true'],
	.age[aria-pressed='true'] {
		background: var(--sun);
		box-shadow: 0 6px 0 var(--ink), 0 0 0 6px var(--ink);
	}
	.age {
		width: var(--tap);
		height: var(--tap);
		border-radius: 22px;
		font-family: var(--title);
		font-weight: 700;
		font-size: 2.2rem;
	}
	.name {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.name input {
		font: inherit;
		font-size: 1.4rem;
		padding: 0.7rem 1rem;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		background: var(--white);
		width: min(20rem, 80vw);
	}
	.go {
		width: var(--tap);
		height: var(--tap);
		border-radius: 22px;
		background: var(--leaf);
		color: var(--white);
		display: grid;
		place-items: center;
		padding: 0;
	}
	footer {
		margin-top: auto;
		display: flex;
		align-items: center;
		gap: 1.2rem;
		width: 100%;
		max-width: 56rem;
	}
	.flags {
		display: flex;
		gap: 0.9rem;
	}
	.note {
		margin: 0 0 0 auto;
		font-size: 0.95rem;
		line-height: 1.4;
		color: var(--mute);
		max-width: 26rem;
	}
	@media (max-width: 640px) {
		main {
			padding: 1.5rem 1rem 2rem;
		}
		.note {
			display: none;
		}
		footer {
			justify-content: space-between;
		}
	}
</style>
