<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Pip from '#lib/Pip.svelte';
	import Avatar from '#lib/Avatar.svelte';
	import Cake from '#lib/Cake.svelte';
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
		<Pip line={t(language, adding ? 'home.age' : 'home.who')} {language} autoSay={greeted} />
		<button type="button" class="round" aria-label="Hear it again" onclick={() => { greeted = true; speak(t(language, adding ? 'home.age' : 'home.who'), language); }}>
			<Icon name="speaker" size={36} />
		</button>
	</div>

	{#if adding}
		<section class="new" aria-label="New player">
			<div class="ages" role="group" aria-label="Age">
				{#each Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => i + MIN_AGE) as a (a)}
					<button type="button" class="age" aria-label="{a} years old" aria-pressed={draft.age === a} onclick={() => (draft.age = a)}>
						<Cake candles={a} lit={draft.age === a} />
						<span class="num">{a}</span>
					</button>
				{/each}
			</div>
			<p class="promise">{language === 'nl'
				? 'Alles wat je kind hier doet blijft gewoon hier, in deze browser. Er gaat niets naar buiten. Ik heb dit voor mijn eigen kinderen gemaakt en deel het graag met de jouwe: gratis, zonder reclame, zonder accounts.'
				: 'Everything your child does here stays right here, in this browser. Nothing goes anywhere. I made this for my own children and I\'m glad to share it with yours: free, no ads, no accounts.'}</p>
			<div class="name">
				<label class="field">
					<span>{language === 'nl' ? 'Naam (typt een volwassene, of sla over)' : 'Name (a grown-up types it, or skip)'}</span>
					<input type="text" maxlength="14" placeholder="Mila" bind:value={draft.name} />
				</label>
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
		<div class="links">
			<a class="chip" href={resolve('/how-we-score')}>{language === 'nl' ? 'Hoe we scoren ›' : 'How we score ›'}</a>
			<a class="chip" href="https://github.com/sarathsp06/gamesforkids" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
			<a class="chip" href={resolve('/small-print')}>{language === 'nl' ? 'Kleine lettertjes' : 'Small print'}</a>
		</div>
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
	.ages {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 1rem;
		width: 100%;
	}
	.age {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		min-height: var(--tap);
		padding: 0.9rem 0.3rem 0.7rem;
		border-radius: 26px;
	}
	.age[aria-pressed='true'] {
		background: var(--sun);
		box-shadow: 0 6px 0 var(--ink), 0 0 0 6px var(--ink);
	}
	.age :global(svg) {
		width: 100%;
		max-width: 5.5rem;
	}
	.num {
		font-family: var(--title);
		font-weight: 700;
		font-size: 2.5rem;
		line-height: 1;
	}
	.name {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}
	.promise {
		margin: 0;
		max-width: 40rem;
		text-align: center;
		font-size: 1rem;
		line-height: 1.45;
		color: var(--mute);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		font-size: 0.95rem;
		color: var(--mute);
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
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.4;
		color: var(--mute);
		max-width: 26rem;
	}
	.links {
		display: flex;
		gap: 0.7rem;
		margin-left: auto;
	}
	.chip {
		padding: 0.55rem 1rem;
		border: 3px solid var(--ink);
		border-radius: 999px;
		background: var(--white);
		box-shadow: 0 4px 0 var(--ink);
		color: inherit;
		text-decoration: none;
		font-weight: 700;
		font-size: 0.95rem;
		white-space: nowrap;
	}
	.chip:active {
		transform: translateY(4px);
		box-shadow: none;
	}
	@media (max-width: 640px) {
		main {
			padding: 1.5rem 1rem 2rem;
		}
		.note {
			display: none;
		}
		.ages {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		.links {
			margin-left: 0;
		}
		footer {
			justify-content: space-between;
		}
	}
</style>
