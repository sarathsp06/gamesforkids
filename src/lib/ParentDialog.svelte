<script lang="ts">
	import { game } from './game.svelte';
	import { LANGUAGES, MAX_TIER } from './words';

	let dialog: HTMLDialogElement;
	export const open = () => dialog.showModal();

	const T = {
		en: {
			settings: 'Settings', close: 'Close', language: 'Language', level: 'Word level', auto: 'Automatic',
			sound: 'Sound effects', stickers: 'Stickers', collected: 'collected', reset: 'Reset', history: 'History',
			empty: 'No games played yet.', when: 'When', time: 'Time', words: 'Words', accuracy: 'Accuracy', min: 'min',
			confirmReset: 'Remove all collected stickers?'
		},
		nl: {
			settings: 'Instellingen', close: 'Sluiten', language: 'Taal', level: 'Woordniveau', auto: 'Automatisch',
			sound: 'Geluidseffecten', stickers: 'Stickers', collected: 'verzameld', reset: 'Wissen', history: 'Geschiedenis',
			empty: 'Nog geen spelletjes gespeeld.', when: 'Wanneer', time: 'Tijd', words: 'Woorden', accuracy: 'Nauwkeurigheid', min: 'min',
			confirmReset: 'Alle verzamelde stickers wissen?'
		}
	};
	const t = $derived(T[game.language]);

	const ago = (iso: string) => {
		const rtf = new Intl.RelativeTimeFormat(game.language, { numeric: 'auto' });
		const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
		if (mins > -60) return rtf.format(mins, 'minute');
		if (mins > -1440) return rtf.format(Math.round(mins / 60), 'hour');
		return rtf.format(Math.round(mins / 1440), 'day');
	};
</script>

<dialog bind:this={dialog} aria-labelledby="parent-title">
	<header>
		<h2 id="parent-title">{t.settings}</h2>
		<button type="button" class="close" onclick={() => dialog.close()}>{t.close}</button>
	</header>

	<fieldset>
		<legend>{t.language}</legend>
		{#each LANGUAGES as l (l.id)}
			<label><input type="radio" name="lang" checked={game.language === l.id} onchange={() => game.setLanguage(l.id)} /> {l.name}</label>
		{/each}
	</fieldset>

	<fieldset>
		<legend>{t.level}</legend>
		<label>
			<input type="radio" name="tier" checked={game.progress.tierMode === 'auto'} onchange={() => game.updateProgress({ tierMode: 'auto' })} />
			{t.auto} ({game.progress.tier})
		</label>
		{#each Array.from({ length: MAX_TIER }, (_, i) => i + 1) as n (n)}
			<label>
				<input
					type="radio"
					name="tier"
					checked={game.progress.tierMode === 'pinned' && game.progress.tier === n}
					onchange={() => game.updateProgress({ tierMode: 'pinned', tier: n })}
				/>
				{n}
			</label>
		{/each}
	</fieldset>

	<label class="row">
		<input type="checkbox" checked={game.progress.sound} onchange={(e) => game.updateProgress({ sound: e.currentTarget.checked })} />
		{t.sound}
	</label>

	<div class="row">
		<span>{t.stickers}: {game.progress.stickers.length} {t.collected}</span>
		<button
			type="button"
			disabled={!game.progress.stickers.length}
			onclick={() => confirm(t.confirmReset) && game.updateProgress({ stickers: [] })}>{t.reset}</button
		>
	</div>

	<h3>{t.history}</h3>
	{#if game.sessions.length}
		<table>
			<thead>
				<tr><th>{t.when}</th><th>{t.time}</th><th>{t.words}</th><th>{t.level}</th><th>{t.accuracy}</th></tr>
			</thead>
			<tbody>
				{#each game.sessions as s (s.id)}
					<tr>
						<td>{ago(s.date)}</td>
						<td>{s.durationMinutes.toFixed(1)} {t.min}</td>
						<td>{s.wordsTyped}</td>
						<td>{s.tier ?? '–'}</td>
						<td>{s.accuracy}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else}
		<p>{t.empty}</p>
	{/if}
</dialog>

<style>
	dialog {
		width: min(40rem, 94vw);
		max-height: 90dvh;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		padding: 1.25rem 1.5rem 1.5rem;
		font-size: 1.05rem;
		line-height: 1.5;
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	h2 {
		margin: 0;
		font-size: 1.6rem;
	}
	h3 {
		margin: 1.25rem 0 0.5rem;
		font-size: 1.2rem;
	}
	fieldset {
		border: 0;
		padding: 0;
		margin: 1rem 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.2rem;
	}
	legend {
		font-weight: 700;
		margin-bottom: 0.3rem;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin: 0.75rem 0;
	}
	button {
		border: 3px solid var(--ink);
		border-radius: 10px;
		background: var(--paper);
		padding: 0.3rem 0.9rem;
		font-weight: 700;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
	}
	th,
	td {
		text-align: right;
		padding: 0.35rem 0.5rem;
		border-bottom: 2px solid #e6e6e6;
	}
	th:first-child,
	td:first-child {
		text-align: left;
	}
	input {
		accent-color: var(--blue);
		width: 1.1rem;
		height: 1.1rem;
	}
</style>
