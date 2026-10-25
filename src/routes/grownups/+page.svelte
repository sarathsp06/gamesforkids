<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Icon from '#lib/Icon.svelte';
	import Avatar from '#lib/Avatar.svelte';
	import { soundOn, voiceOn } from '#lib/audio.ts';
	import { GAMES, MAX_AGE, MIN_AGE, modeFor, type Player } from '#lib/players.ts';
	import { loadLanguage, loadPlayLog, loadPlayers, loadSettings, saveLanguage, savePlayers, saveSettings, type Players, type Settings } from '#lib/storage.ts';
	import { week } from '#lib/playlog.ts';
	import { levelOf } from '#lib/levels.ts';
	import { gameName } from '#lib/i18n.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';

	let language = $state<Language>('en');
	let players = $state<Players>({ v: 1, list: [], current: null });
	let settings = $state<Settings>({ v: 1, voice: true, sound: true, timers: false, pace: 'calm' });
	let editing = $state<string | null>(null);
	let days = $state<{ label: Date; minutes: number }[]>([]);
	let minutes = $state<Record<string, number>>({});

	const T = {
		en: {
			title: 'Grown-ups', hint: 'Opened by holding the gear for three seconds. Everything here stays on this device. The flags set the language of the games and of this page.',
			players: 'Players', little: 'Little', big: 'Big', auto: 'by age', edit: 'Edit', done: 'Done', remove: 'Remove',
			confirm: 'Remove this player? Stickers and progress on this device stay.', mode: 'Mode',
			sound: 'Sound', voice: "Pip's voice", effects: 'Sound effects', pace: 'Speaking pace', calm: 'Calm', normal: 'Normal',
			timers: 'Timers in Number Dash', week: 'This week', weekHint: 'Minutes played and where each game stands. No scores are shown to the child.',
			about: 'About this app', promise: 'Everything a child does here stays in this browser, on this device. Nothing is sent to a server, there are no accounts, no ads and no tracking, and there never will be. This is a parent\'s project for their own children, shared freely: the code is open under the MIT licence, with no plan to sell it and no obligations either way.',
			level: 'Level', min: 'min', none: 'Nothing played yet this week.', score: 'How we score', note:
				'Reads like a teacher\'s note, not a dashboard: what the child can do now. The full "How we score" page is here, not on the child\'s home.'
		},
		nl: {
			title: 'Volwassenen', hint: 'Open je door het tandwiel drie seconden vast te houden. Alles hier blijft op dit apparaat. De vlaggen kiezen de taal van de spelletjes en van deze pagina.',
			players: 'Spelers', little: 'Klein', big: 'Groot', auto: 'op leeftijd', edit: 'Wijzig', done: 'Klaar', remove: 'Verwijder',
			confirm: 'Deze speler verwijderen? Stickers en voortgang op dit apparaat blijven.', mode: 'Stand',
			sound: 'Geluid', voice: 'De stem van Pip', effects: 'Geluidseffecten', pace: 'Spreektempo', calm: 'Rustig', normal: 'Normaal',
			timers: 'Klok in Rekenrace', week: 'Deze week', weekHint: 'Gespeelde minuten en waar elk spel staat. Het kind ziet geen scores.',
			about: 'Over deze app', promise: 'Alles wat een kind hier doet blijft in deze browser, op dit apparaat. Er gaat niets naar een server, er zijn geen accounts, geen reclame en geen tracking, en dat blijft zo. Dit is een project van een ouder voor de eigen kinderen, vrij gedeeld: de code is open onder de MIT-licentie, zonder plannen om het te verkopen en zonder verplichtingen.',
			level: 'Niveau', min: 'min', none: 'Deze week nog niets gespeeld.', score: 'Hoe we scoren', note:
				'Leest als een briefje van de juf, niet als een dashboard: wat het kind nu kan. De volledige uitleg staat hier, niet op het startscherm van het kind.'
		}
	};
	const s = $derived(T[language]);

	onMount(() => {
		language = loadLanguage();
		players = loadPlayers();
		settings = loadSettings();
		const w = week(loadPlayLog());
		days = w.days;
		minutes = w.games;
	});

	function update(patch: Partial<Settings>) {
		settings = { ...settings, ...patch };
		saveSettings(settings);
		soundOn.value = settings.sound;
		voiceOn.value = settings.voice;
	}
	function patchPlayer(id: string, patch: Partial<Player>) {
		players = { ...players, list: players.list.map((p) => (p.id === id ? { ...p, ...patch } : p)) };
		savePlayers(players);
	}
	function remove(id: string) {
		if (!confirm(s.confirm)) return;
		players = { v: 1, list: players.list.filter((p) => p.id !== id), current: players.current === id ? null : players.current };
		savePlayers(players);
		editing = null;
	}
	const day = (d: Date) => d.toLocaleDateString(language === 'nl' ? 'nl' : 'en', { weekday: 'short' });
	const most = $derived(Math.max(1, ...days.map((d) => d.minutes)));
</script>

<main>
	<header>
		<h1>{s.title}</h1>
		<span class="hint">{s.hint}</span>
		<div class="flags" role="group" aria-label="Language">
			{#each LANGUAGES as l (l.id)}
				<button
					type="button"
					class="flag"
					aria-label={l.name}
					aria-pressed={language === l.id}
					onclick={() => {
						language = l.id;
						saveLanguage(l.id);
					}}><Icon name={l.id} size={28} /></button
				>
			{/each}
		</div>
		<a class="close" href={resolve('/home')} aria-label="Close"><Icon name="close" size={22} /></a>
	</header>

	<div class="cols">
		<div class="side">
			<section class="box">
				<h2>{s.players}</h2>
				{#each players.list as p, i (p.id)}
					<div class="player c{i % 4}">
						<Avatar avatar={p.avatar} size={34} />
						{#if editing === p.id}
							<label class="field">{s.mode}
								<select value={p.mode ?? 'auto'} onchange={(e) => patchPlayer(p.id, { mode: e.currentTarget.value === 'auto' ? undefined : (e.currentTarget.value as 'little' | 'big') })}>
									<option value="auto">{s.auto}</option><option value="little">{s.little}</option><option value="big">{s.big}</option>
								</select>
							</label>
							<select value={p.age} aria-label="Age" onchange={(e) => patchPlayer(p.id, { age: Number(e.currentTarget.value) })}>
								{#each Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, j) => j + MIN_AGE) as a (a)}<option value={a}>{a}</option>{/each}
							</select>
							<button type="button" class="small" onclick={() => remove(p.id)}>{s.remove}</button>
							<button type="button" class="small" onclick={() => (editing = null)}>{s.done}</button>
						{:else}
							<span class="who">{p.name} · {p.age} · {modeFor(p) === 'little' ? s.little : s.big}</span>
							<button type="button" class="small" onclick={() => (editing = p.id)}>{s.edit}</button>
						{/if}
					</div>
				{/each}
				<span class="fine">{language === 'nl' ? 'De stand volgt de leeftijd (3–5 klein, 6–9 groot) en kan vastgezet worden.' : 'Mode follows age (3–5 Little, 6–9 Big) and can be pinned.'}</span>
			</section>

			<section class="box">
				<h2>{s.sound}</h2>
				<label class="row"><span>{s.voice}</span><input type="checkbox" checked={settings.voice} onchange={(e) => update({ voice: e.currentTarget.checked })} /></label>
				<label class="row"><span>{s.effects}</span><input type="checkbox" checked={settings.sound} onchange={(e) => update({ sound: e.currentTarget.checked })} /></label>
				<label class="row"><span>{s.pace}</span>
					<select value={settings.pace} onchange={(e) => update({ pace: e.currentTarget.value as 'calm' | 'normal' })}>
						<option value="calm">{s.calm}</option><option value="normal">{s.normal}</option>
					</select>
				</label>
				<label class="row"><span>{s.timers}</span><input type="checkbox" checked={settings.timers} onchange={(e) => update({ timers: e.currentTarget.checked })} /></label>
			</section>
		</div>

		<div class="mainc">
			<section class="box week">
				<div class="wh"><h2>{s.week}</h2><span class="fine">{s.weekHint}</span></div>
				<div class="chart" aria-label={days.map((d) => `${day(d.label)}: ${Math.round(d.minutes)} ${s.min}`).join(', ')}>
					{#each days as d (d.label.getTime())}
						<div class="col">
							<div class="bar" style="--h: {d.minutes ? Math.max(6, (d.minutes / most) * 100) : 0}%" class:zero={!d.minutes}></div>
							<span>{day(d.label)}</span>
						</div>
					{/each}
				</div>
				<div class="notes">
					{#each GAMES as g (g.id)}
						{@const lv = levelOf(g.id)}
						<div class="note {g.tint}">
							<span class="fine">{gameName(language, g.id).text}</span>
							<span>{s.level} {lv.at} / {lv.of}{minutes[g.id] ? ` · ${Math.round(minutes[g.id])} ${s.min}` : ''}</span>
						</div>
					{/each}
				</div>
			</section>
			<section class="box">
				<h2>{s.about}</h2>
				<p class="promise">{s.promise}</p>
				<div class="links">
					<a href="https://github.com/sarathsp06/gamesforkids" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
					<a href="https://github.com/sarathsp06/gamesforkids/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT</a>
				</div>
			</section>
			<section class="box foot">
				<span>{s.note}</span>
				<a href={resolve('/how-we-score')}>{s.score}</a>
			</section>
		</div>
	</div>
</main>

<style>
	main {
		min-height: 100dvh;
		padding: 2rem 3rem;
		display: flex;
		flex-direction: column;
		gap: 1.4rem;
		font-size: 1rem;
	}
	header {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 2rem;
	}
	h2 {
		margin: 0;
		font-size: 1.15rem;
	}
	.hint,
	.fine {
		font-size: 0.9rem;
		color: var(--mute);
		line-height: 1.4;
	}
	.flags {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
	}
	.flag {
		width: 3rem;
		height: 3rem;
		padding: 0;
		border: 3px solid var(--ink);
		border-radius: 50%;
		background: var(--white);
		display: grid;
		place-items: center;
	}
	.flag[aria-pressed='true'] {
		box-shadow: 0 0 0 4px var(--ink);
	}
	.close {
		width: 3rem;
		height: 3rem;
		border: 3px solid var(--ink);
		border-radius: 50%;
		background: var(--white);
		display: grid;
		place-items: center;
		color: inherit;
	}
	.cols {
		display: grid;
		grid-template-columns: 19rem minmax(0, 1fr);
		gap: 1.6rem;
		flex: 1;
	}
	.side,
	.mainc {
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.box {
		display: flex;
		flex-direction: column;
		gap: 0.7rem;
		padding: 1rem 1.1rem;
		border: 3px solid var(--ink);
		border-radius: 20px;
		background: var(--white);
	}
	.player {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		padding: 0.5rem 0.6rem;
		border: 3px solid var(--ink);
		border-radius: 14px;
	}
	.c0 {
		background: var(--sky);
	}
	.c1 {
		background: var(--butter);
	}
	.c2 {
		background: var(--blush);
	}
	.c3 {
		background: var(--mint);
	}
	.who {
		flex: 1;
	}
	.small,
	select {
		font: inherit;
		font-size: 0.9rem;
		padding: 0.25rem 0.6rem;
		border: 2px solid var(--ink);
		border-radius: 10px;
		background: var(--white);
	}
	.field {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.row input {
		width: 1.4rem;
		height: 1.4rem;
	}
	.week {
		flex: 1;
	}
	.wh {
		display: flex;
		align-items: baseline;
		gap: 0.8rem;
		flex-wrap: wrap;
	}
	.chart {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 0.5rem;
		height: 7.5rem;
		align-items: end;
	}
	.col {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-end;
		gap: 0.3rem;
		height: 100%;
	}
	.bar {
		width: 100%;
		height: var(--h);
		background: var(--blue);
		border: 3px solid var(--ink);
		border-radius: 8px 8px 0 0;
	}
	.bar.zero {
		height: 4px;
		border: 0;
		background: var(--ink);
	}
	.notes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
		gap: 0.6rem;
	}
	.note {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.6rem 0.8rem;
		border: 3px solid var(--ink);
		border-radius: 14px;
	}
	.note.mint {
		background: var(--mint);
	}
	.note.blush {
		background: var(--blush);
	}
	.note.butter {
		background: var(--butter);
	}
	.note.sky {
		background: var(--sky);
	}
	.note.paper {
		background: var(--paper);
	}
	.promise {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
	}
	.links {
		display: flex;
		gap: 1rem;
		font-weight: 700;
	}
	.links a {
		color: var(--blue);
	}
	.foot {
		flex-direction: row;
		align-items: center;
		gap: 1rem;
		font-size: 0.9rem;
		line-height: 1.4;
	}
	.foot a {
		font-weight: 700;
		white-space: nowrap;
		color: var(--blue);
	}
	@media (max-width: 760px) {
		main {
			padding: 1.2rem 1rem;
		}
		.cols {
			grid-template-columns: 1fr;
		}
	}
</style>
