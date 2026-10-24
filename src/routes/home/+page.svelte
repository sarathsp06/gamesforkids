<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Pip from '#lib/Pip.svelte';
	import Avatar from '#lib/Avatar.svelte';
	import Icon from '#lib/Icon.svelte';
	import GameArt from '#lib/GameArt.svelte';
	import GearHold from '#lib/GearHold.svelte';
	import { speak, stopSpeech } from '#lib/audio.ts';
	import { gameName, t } from '#lib/i18n.ts';
	import type { Language } from '#lib/words.ts';
	import { GAMES, gamesFor, modeFor, type Mode, type Player } from '#lib/players.ts';
	import { currentPlayer, loadLanguage, loadPlayLog } from '#lib/storage.ts';
	import { levelOf, type Level } from '#lib/levels.ts';
	import { stickerCount } from '#lib/stickers.ts';
	import { week } from '#lib/playlog.ts';

	let language = $state<Language>('en');
	let player = $state<Player | null>(null);
	let mode = $state<Mode>('big');
	let stickers = $state(0);
	let levels = $state<Record<string, Level>>({});
	let suggest = $state('');
	let opening = $state('');
	let timer = 0;

	onMount(() => {
		language = loadLanguage();
		player = currentPlayer();
		if (!player) {
			goto(resolve('/'), { replaceState: true });
			return;
		}
		mode = modeFor(player);
		stickers = stickerCount();
		levels = Object.fromEntries(GAMES.map((g) => [g.id, levelOf(g.id)]));
		// Pip suggests the game played least this week.
		const minutes = week(loadPlayLog()).games;
		suggest = [...GAMES].sort((a, b) => (minutes[a.id] ?? 0) - (minutes[b.id] ?? 0))[0].id;
		return () => {
			clearTimeout(timer);
			stopSpeech();
		};
	});

	/** Pip says the game's name, then it opens: the tile teaches its own label. */
	function open(id: string, path: string) {
		if (opening) return;
		opening = id;
		const go = () => goto(resolve(path as '/'));
		speak(gameName(language, id), language, go);
		timer = window.setTimeout(go, 2500);
	}
	const label = (id: string) => (id ? gameName(language, id).text : '');
</script>

<main class={mode}>
	<header>
		<a class="pill player" href={resolve('/')} aria-label="{player?.name}: change player">
			{#if player}<Avatar avatar={player.avatar} size={52} /><span class="pname">{player.name}</span>{/if}
		</a>
		{#if mode === 'little'}
			<div class="pipwrap"><Pip line={t(language, 'home.what')} {language} size={64} /></div>
		{:else}
			<h1>{language === 'nl' ? 'Kies een spel' : 'Pick a game'}</h1>
		{/if}
		<div class="right">
			<a class="pill book" href={resolve('/stickers')} aria-label="Sticker book: {stickers} stickers">
				<Icon name="star" size={32} /><span class="pname">{stickers}</span>
			</a>
			{#if mode === 'big'}<GearHold />{/if}
		</div>
	</header>

	<section class="tiles" class:cols3={mode === 'little'} class:cols4={mode === 'big'}>
		{#each gamesFor(mode) as g (g.id)}
			<button
				type="button"
				class="tile {g.tint}"
				class:opening={opening === g.id}
				aria-label="{label(g.id)}, level {levels[g.id]?.at} of {levels[g.id]?.of}"
				onclick={() => open(g.id, g.path)}
			>
				<GameArt game={g.id} width={mode === 'little' ? 170 : 120} />
				{#if mode === 'big'}
					<span class="tname">{label(g.id)}</span>
					<span class="dots" aria-hidden="true">
						{#each Array.from({ length: levels[g.id]?.of ?? 0 }, (_, i) => i) as i (i)}<i class:on={i < (levels[g.id]?.at ?? 0)}></i>{/each}
					</span>
				{/if}
			</button>
		{/each}
		{#if mode === 'little'}
			<div class="tile locked" aria-label="More games in Big mode">
				<Icon name="lock" size={80} />
				<span class="tname faint">{language === 'nl' ? 'Schaakpad, Lees Mee: grote stand' : 'Chess, Read Along: Big mode'}</span>
			</div>
		{:else}
			<div class="tile card">
				<Pip line={t(language, 'home.try')} {language} size={64} />
				{#if suggest}
					<button type="button" class="try" onclick={() => open(suggest, GAMES.find((g) => g.id === suggest)!.path)}>
						<GameArt game={suggest} width={70} /><span>{label(suggest)}</span>
					</button>
				{/if}
			</div>
		{/if}
	</section>
</main>

<style>
	main {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		gap: 1.6rem;
		padding: 2rem 3rem 2.2rem;
	}
	header {
		display: flex;
		align-items: center;
		gap: 1.1rem;
		flex-wrap: wrap;
	}
	h1 {
		margin: 0 0 0 0.5rem;
		font-size: 2.1rem;
	}
	.pipwrap {
		margin-left: auto;
	}
	.right {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		margin-left: auto;
	}
	.pipwrap + .right {
		margin-left: 0;
	}
	.pill {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.4rem 1.1rem 0.4rem 0.4rem;
		border: var(--line) solid var(--ink);
		border-radius: 999px;
		background: var(--sky);
		box-shadow: 0 6px 0 var(--ink);
		color: inherit;
		text-decoration: none;
		min-height: 4rem;
	}
	.pill.book {
		background: var(--butter);
		padding: 0.5rem 1.1rem 0.5rem 0.8rem;
	}
	.big .pill.book {
		background: var(--white);
	}
	.pill:active {
		transform: translateY(6px);
		box-shadow: none;
	}
	.pname {
		font-family: var(--title);
		font-weight: 700;
		font-size: 1.6rem;
	}
	.tiles {
		display: grid;
		gap: 1.6rem;
		flex: 1;
		min-height: 0;
	}
	.cols3 {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.cols4 {
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 1.4rem;
	}
	.tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.7rem;
		min-height: 11rem;
		padding: 1rem;
		border: var(--line) solid var(--ink);
		border-radius: 30px;
		background: var(--white);
		box-shadow: 0 8px 0 var(--ink);
		color: inherit;
		transition: transform 120ms, box-shadow 120ms;
	}
	.tile:active,
	.tile.opening {
		transform: translateY(8px);
		box-shadow: none;
	}
	.tile.mint {
		background: var(--mint);
	}
	.tile.blush {
		background: var(--blush);
	}
	.tile.butter {
		background: var(--butter);
	}
	.tile.sky {
		background: var(--sky);
	}
	.tile.paper {
		background: var(--white);
	}
	.tile.locked {
		border-style: dashed;
		box-shadow: none;
		opacity: 0.55;
		cursor: default;
	}
	.tile.card {
		box-shadow: none;
		cursor: default;
	}
	.tname {
		font-family: var(--title);
		font-weight: 700;
		font-size: 1.5rem;
		text-align: center;
	}
	.faint {
		font-family: inherit;
		font-weight: 400;
		font-size: 1rem;
		color: var(--mute);
	}
	.dots {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 5px;
	}
	.dots i {
		width: 14px;
		height: 14px;
		border: 3px solid var(--ink);
		border-radius: 50%;
		background: var(--white);
	}
	.dots i.on {
		background: var(--sun);
	}
	.try {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 1rem 0.4rem 0.5rem;
		border: 3px solid var(--ink);
		border-radius: 999px;
		background: var(--white);
		box-shadow: 0 4px 0 var(--ink);
		font-family: var(--title);
		font-weight: 700;
		font-size: 1.1rem;
	}
	.card :global(.bubble) {
		font-size: 1.1rem;
	}
	@media (max-width: 760px) {
		main {
			padding: 1.4rem 1.2rem 2rem;
		}
		.cols3,
		.cols4 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 1rem;
		}
		.tile {
			min-height: 9.5rem;
		}
		h1 {
			display: none;
		}
		.pipwrap {
			order: 3;
			width: 100%;
			margin: 0;
		}
	}
</style>
