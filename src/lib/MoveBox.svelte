<script lang="ts">
	/**
	 * Grown-ups: move this device's progress to another one (design/progress-transfer). A QR code opens a
	 * one-time room on the other device; a grown-up checks the two pictures match and taps Send. A file is the
	 * full backup; the small link works with no connection, without the pictures.
	 */
	import { onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import Emoji from './Emoji.svelte';
	import ImportConfirm from './ImportConfirm.svelte';
	import { SLOW_MS, handoff, matchPictures, type Handoff } from './handoff';
	import { newKey } from './presence';
	import { fileName, gather, toLink, validate, type Bundle, type Options } from './transfer';
	import type { Language } from './words';

	let { language }: { language: Language } = $props();

	let plays = $state<Options['plays']>('month');
	let withSettings = $state(false);
	let mode = $state<'idle' | 'qr' | 'match' | 'sent' | 'link' | 'confirm' | 'done' | 'bad'>('idle');
	let qr = $state('');
	/** The address in the send QR code, also offered to copy for a device without a camera. */
	let takeUrl = $state('');
	let match = $state<[string, string] | null>(null);
	let slow = $state(false);
	let peer: string | null = null;
	let link = $state('');
	let copied = $state(false);
	let incoming = $state<Bundle | null>(null);
	let dropped = $state(0);
	let session: Handoff | null = null;
	let slowTimer: ReturnType<typeof setTimeout> | undefined;

	const T = {
		en: {
			title: 'Move to another device',
			hint: 'Copy this device\'s players, stickers, levels and pictures to a phone, tablet or computer. The other device adds them to what it has; nothing is replaced.',
			plays: 'Play history', month: 'Last month', all: 'All',
			settings: 'Also copy settings',
			send: 'Send to another device', save: 'Save to a file', open: 'Open a file', small: 'Small link, no connection needed',
			scan: 'Scan this with the other device\'s camera. It opens this site there.',
			waiting: 'Waiting for the other device…',
			slow: 'Not connecting? Some networks block direct connections. Use the small link instead.',
			check: 'Does the other device show these two pictures?',
			sendNow: 'Yes, send', cancel: 'Cancel',
			sent: 'Sent. The other device asks its grown-up before adding anything. It may offer to send its own progress back.',
			linkHint: 'Open this link on the other device: by AirDrop, a message to yourself or email. It is not encrypted: anyone with the link can read it. Pictures stay here.',
			copy: 'Copy link', copiedMsg: 'Copied', copyTake: 'No camera? Copy the link instead',
			tooLong: 'Too long for a QR code: copy the link instead.',
			done: (n: number) => (n ? `Added. ${n} picture${n === 1 ? '' : 's'} didn't fit on this device.` : 'Added.'),
			bad: 'That isn\'t a Games for Kids file, or it comes from a newer version. Update this page and try again.',
			plain: 'A file is a full backup, pictures included. It is not encrypted: keep it where you keep family photos.'
		},
		nl: {
			title: 'Naar een ander apparaat',
			hint: 'Kopieer de spelers, stickers, niveaus en tekeningen van dit apparaat naar een telefoon, tablet of computer. Het andere apparaat voegt ze toe aan wat het al heeft; er wordt niets vervangen.',
			plays: 'Speelgeschiedenis', month: 'Afgelopen maand', all: 'Alles',
			settings: 'Ook de instellingen kopiëren',
			send: 'Stuur naar een ander apparaat', save: 'Bewaar als bestand', open: 'Open een bestand', small: 'Korte link, geen verbinding nodig',
			scan: 'Scan dit met de camera van het andere apparaat. Daar opent deze site.',
			waiting: 'Wachten op het andere apparaat…',
			slow: 'Lukt het niet? Sommige netwerken blokkeren rechtstreekse verbindingen. Gebruik dan de korte link.',
			check: 'Toont het andere apparaat deze twee plaatjes?',
			sendNow: 'Ja, stuur', cancel: 'Annuleer',
			sent: 'Verstuurd. Het andere apparaat vraagt eerst de volwassene voordat er iets bijkomt. Het kan aanbieden om zijn eigen voortgang terug te sturen.',
			linkHint: 'Open deze link op het andere apparaat: via AirDrop, een berichtje aan jezelf of e-mail. Hij is niet versleuteld: wie de link heeft, kan hem lezen. Tekeningen blijven hier.',
			copy: 'Kopieer link', copiedMsg: 'Gekopieerd', copyTake: 'Geen camera? Kopieer dan de link',
			tooLong: 'Te lang voor een QR-code: kopieer de link.',
			done: (n: number) => (n ? `Toegevoegd. ${n} tekening${n === 1 ? '' : 'en'} pasten niet op dit apparaat.` : 'Toegevoegd.'),
			bad: 'Dat is geen bestand van Games for Kids, of het komt van een nieuwere versie. Ververs deze pagina en probeer opnieuw.',
			plain: 'Een bestand is een volledige back-up, met tekeningen. Het is niet versleuteld: bewaar het waar je ook familiefoto\'s bewaart.'
		}
	};
	const s = $derived(T[language]);
	const opts = () => ({ plays, settings: withSettings });

	/** The move page's address on this site; the key or the small link go after the #, which never leaves the browser. */
	const moveUrl = (hash: string) => {
		const path = resolve('/move');
		return `${location.origin}${path.endsWith('/') ? path : `${path}/`}#${hash}`;
	};
	async function qrSvg(text: string): Promise<string> {
		const QR = await import('qrcode');
		return QR.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'L' });
	}

	function stop() {
		clearTimeout(slowTimer);
		session?.leave();
		session = null;
		peer = null;
	}
	async function send() {
		stop();
		const key = newKey();
		takeUrl = moveUrl(`take=${key}`);
		qr = await qrSvg(takeUrl);
		match = await matchPictures(key);
		slow = false;
		mode = 'qr';
		slowTimer = setTimeout(() => (slow = mode === 'qr'), SLOW_MS);
		session = await handoff(key, {
			onPeer: (p) => {
				peer = p;
				if (p && mode === 'qr') mode = 'match';
				if (!p && mode === 'match') mode = 'qr';
			},
			// The other device may send its own progress back after taking ours in.
			onBundle: (b) => {
				incoming = b;
				mode = 'confirm';
			},
			onBad: () => (mode = 'bad')
		});
	}
	function sendNow() {
		if (!session || !peer) return;
		session.send(gather(opts()), peer);
		mode = 'sent';
	}
	function save() {
		const blob = new Blob([JSON.stringify(gather(opts()))], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = fileName();
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}
	async function open(e: Event & { currentTarget: HTMLInputElement }) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		let b: Bundle | null = null;
		try {
			b = validate(JSON.parse(await file.text()));
		} catch {
			b = null;
		}
		stop();
		if (!b) return void (mode = 'bad');
		incoming = b;
		mode = 'confirm';
	}
	async function small() {
		stop();
		link = moveUrl(`move=${await toLink(gather({ ...opts(), gallery: false }))}`);
		qr = link.length <= 2000 ? await qrSvg(link) : '';
		copied = false;
		mode = 'link';
	}
	async function copy(text = link) {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
		} catch {
			copied = false;
		}
	}
	function confirmed(taken: boolean, n: number) {
		incoming = null;
		dropped = n;
		mode = taken ? 'done' : 'idle';
		stop();
	}
	onDestroy(stop);
</script>

<section class="box">
	<h2>{s.title}</h2>
	<span class="fine">{s.hint}</span>
	<div class="row">
		<span>{s.plays}</span>
		<select bind:value={plays}><option value="month">{s.month}</option><option value="all">{s.all}</option></select>
	</div>
	<label class="row"><span>{s.settings}</span><input type="checkbox" bind:checked={withSettings} /></label>
	<div class="actions">
		<button type="button" class="primary" onclick={send}>{s.send}</button>
		<button type="button" onclick={save}>{s.save}</button>
		<label class="file">{s.open}<input type="file" accept="application/json,.json" onchange={open} /></label>
		<button type="button" onclick={small}>{s.small}</button>
	</div>
	<span class="fine">{s.plain}</span>

	{#if mode === 'qr' || mode === 'match'}
		<div class="panel">
			{#if mode === 'qr'}
				<span>{s.scan}</span>
				<!-- The SVG is made here by the qrcode library from our own address. -->
				<div class="qr" data-link={takeUrl}>{@html qr}</div>
				<button type="button" onclick={() => copy(takeUrl)}>{copied ? s.copiedMsg : s.copyTake}</button>
				<span class="fine">{s.waiting}</span>
				{#if slow}<span class="fine warn">{s.slow}</span>{/if}
			{:else if match}
				<span>{s.check}</span>
				<div class="match"><Emoji glyph={match[0]} size={56} /><Emoji glyph={match[1]} size={56} /></div>
				<div class="actions"><button type="button" class="primary" onclick={sendNow}>{s.sendNow}</button></div>
			{/if}
			<div class="actions"><button type="button" onclick={() => { stop(); mode = 'idle'; }}>{s.cancel}</button></div>
		</div>
	{:else if mode === 'sent'}
		<div class="panel"><span>{s.sent}</span></div>
	{:else if mode === 'link'}
		<div class="panel">
			<span class="fine">{s.linkHint}</span>
			{#if qr}<div class="qr" data-link={link}>{@html qr}</div>{:else}<span class="fine">{s.tooLong}</span>{/if}
			<div class="actions"><button type="button" onclick={() => copy()}>{copied ? s.copiedMsg : s.copy}</button><button type="button" onclick={() => (mode = 'idle')}>{s.cancel}</button></div>
		</div>
	{:else if mode === 'confirm' && incoming}
		<ImportConfirm bundle={incoming} {language} onDone={confirmed} />
	{:else if mode === 'done'}
		<div class="panel"><span>{s.done(dropped)}</span></div>
	{:else if mode === 'bad'}
		<div class="panel"><span class="warn">{s.bad}</span></div>
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
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.8rem;
	}
	.row input {
		width: 22px;
		height: 22px;
	}
	.fine {
		font-size: 0.9rem;
		color: var(--mute);
		line-height: 1.4;
	}
	.warn {
		color: var(--red);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
	}
	button,
	select,
	.file {
		font: inherit;
		font-size: 0.9rem;
		padding: 0.3rem 0.8rem;
		border: 2px solid var(--ink);
		border-radius: 10px;
		background: var(--white);
		cursor: pointer;
	}
	.file input {
		display: none;
	}
	.primary {
		background: var(--sun);
		font-weight: 700;
	}
	.panel {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.8rem;
		border: 2px dashed var(--ink);
		border-radius: 14px;
	}
	.qr {
		width: min(260px, 70vw);
		background: #fff;
	}
	.qr :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}
	.match {
		display: flex;
		gap: 0.8rem;
	}
</style>
