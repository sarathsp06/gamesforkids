<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import Atrament, { MODE_DISABLED, MODE_DRAW } from 'atrament';
	import FloodFill from 'q-floodfill';
	import { speak, stopSpeech, sfx } from '#lib/audio.ts';
	import { CHAPTERS, CRAYONS, PICTURES, type Chapter, type Crayon, type Picture } from '#lib/paint.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import { chapterName, colour, painted, pictureName, t } from '#lib/i18n.ts';
	import { addToGallery, loadGallery, loadLanguage, loadPainted, saveLanguage, savePainted } from '#lib/storage.ts';
	import Icon from '#lib/Icon.svelte';
	import Pip from '#lib/Pip.svelte';
	import Reward from '#lib/Reward.svelte';
	import { awardSticker } from '#lib/stickers.ts';
	import { trackPlay } from '#lib/playlog.ts';
	import { currentPlayer, loadSettings, saveSettings } from '#lib/storage.ts';
	import { Together, type Event as TogetherEvent, type Friend } from '#lib/presence.svelte.ts';
	import PresenceStrip from '#lib/PresenceStrip.svelte';
	import TogetherSheet from '#lib/TogetherSheet.svelte';
	import Avatar from '#lib/Avatar.svelte';
	import { drawFills, fillsOf, pictureUrl, regionsOf } from '#lib/regions.ts';
	import type { Line } from '#lib/i18n.ts';

	const SIZE = 800; // canvas bitmap; CSS scales it to the screen
	const SCALE = SIZE / 100; // picture paths are drawn on a 100×100 grid
	const BRUSH = 34; // brush width in bitmap pixels, whatever the screen size
	// The outline the bucket stops at, and a thicker copy on top that hides the fill's soft edge against it.
	const EDGE = 1.2;
	const LINE = 1.8;
	const TOLERANCE = 48; // per colour channel: a fill also takes the soft edges of brush strokes
	const UNDO_MAX = 8;
	const THUMB = 320; // gallery pictures, in pixels
	const FILLS_MS = 3000; // how often a friend painting alongside sees this picture's colours
	const AT_MS = 100; // and this crayon's position

	let phase = $state<'start' | 'paint' | 'done' | 'gallery'>('start');
	/** The story whose pictures are shown; none: the list of chapters. */
	let chapter = $state<Chapter | null>(null);
	let done = $state<string[]>([]);
	let language = $state<Language>('en');
	let picture = $state<Picture>(PICTURES[0]);
	let crayon = $state<Crayon>(CRAYONS[0]);
	let tool = $state<'brush' | 'bucket'>('brush');
	let canUndo = $state(false);
	let finished = $state('');
	let gallery = $state<string[]>([]);
	let viewing = $state('');
	/** Big mode shows the name under each picture and chapter; Little mode shows pictures only. */
	let big = $state(false);
	let newSticker = $state('');
	/** Fallback that shows the reward if the finished-picture speech never reports its end. */
	let doneTimer: ReturnType<typeof setTimeout> | undefined;

	let paper = $state<HTMLCanvasElement>();
	let lines = $state<HTMLCanvasElement>();
	let pad: Atrament | null = null;
	let undo: ImageData[] = [];

	// Painting with others (design/presence): only when a grown-up turned it on.
	let online = $state(false);
	let together = $state<Together | null>(null);
	let sheet = $state<TogetherSheet>();
	let me = $state(0);
	/** Pip's line about the others, shown and said once; cleared on the next screen. */
	let otherLine = $state<Line | null>(null);
	/** Pip asking something about a friend: the child answers with ▶ or ✕. */
	let asking = $state<{ kind: 'ask'; key: string } | { kind: 'wants' } | null>(null);
	let friendCanvas = $state<HTMLCanvasElement>();
	let shelfSaid = false;
	let lastFills = '';
	let lastAt = 0;
	let fillsTimer: ReturnType<typeof setInterval> | undefined;
	const screen = $derived(phase === 'paint' ? 'paint' : chapter ? 'pictures' : 'chapters');
	$effect(() => together?.setScreen(screen));

	function say(
		key: 'paint.others' | 'friend.here' | 'friend.ask' | 'friend.wants' | 'friend.yes' | 'friend.no' | 'friend.finished' | 'friend.away' | 'friend.how' | 'friend.pick'
	) {
		otherLine = t(language, key);
		speak(otherLine, language);
	}

	function heard(e: TogetherEvent, data?: string) {
		if (e === 'friendHere' && phase === 'start') say('friend.here');
		else if (e === 'invited') {
			asking = { kind: 'wants' };
			say('friend.wants');
		} else if (e === 'accepted') say('friend.yes');
		else if (e === 'declined') say('friend.no');
		else if (e === 'friendDone') say('friend.finished');
		else if (e === 'friendAway') say('friend.away');
		else if (e === 'open' && data) {
			const p = PICTURES.find((x) => x.id === data);
			if (p && (phase !== 'paint' || picture.id !== p.id)) choose(p, false);
		}
	}

	function onFriend(key: string) {
		if (together?.with) return;
		asking = { kind: 'ask', key };
		say('friend.ask');
	}
	/** The friends button: the sheet shows who is here, and tells a grown-up how to pair. */
	function openTogether() {
		asking = null;
		sheet?.open();
		say(together && Object.keys(together.online).length ? 'friend.pick' : 'friend.how');
	}
	function inviteFromSheet(key: string) {
		otherLine = null;
		if (together && !together.with) together.invite(key);
	}
	function startTogether() {
		const tg = new Together();
		tg.on(heard);
		together = tg;
		void tg.start({ language, avatar: me, publicToo: true }).catch((e) => console.warn('Paint Pot together: could not connect', e));
	}
	/** The grown-ups switch, turned from the sheet: connect or leave at once, as Grown-ups would on the next visit. */
	function setOnline(on: boolean) {
		saveSettings({ ...loadSettings(), online: on });
		online = on;
		if (on && !together) startTogether();
		if (!on) {
			together?.stop();
			together = null;
		}
	}
	function friendAdded(f: Friend) {
		void together?.meet(f);
	}

	function answerAsk(yes: boolean) {
		const a = asking;
		asking = null;
		otherLine = null;
		if (!a || !together) return;
		if (a.kind === 'ask') {
			if (yes) together.invite(a.key);
		} else together.answer(yes);
	}

	/** This picture as region crayons: what a friend sees and what the shelf shows. Null if it can't be read. */
	function currentFills() {
		const r = regionsOf(picture.id);
		return r && paper ? { n: r.count, fills: fillsOf(paper, r) } : null;
	}
	function sendFills() {
		if (!together?.painting || phase !== 'paint') return;
		const f = currentFills();
		if (!f) return;
		const key = JSON.stringify(f.fills);
		if (key === lastFills) return;
		lastFills = key;
		together.sendFills({ v: 1, picture: picture.id, ...f });
	}
	function sendAt(e: PointerEvent) {
		if (!together?.painting || !e.isPrimary || Date.now() - lastAt < AT_MS) return;
		lastAt = Date.now();
		const x = e.offsetX / paper!.offsetWidth;
		const y = e.offsetY / paper!.offsetHeight;
		if (x >= 0 && x <= 1 && y >= 0 && y <= 1) together.sendAt({ v: 1, x, y });
	}
	// The friend's picture, redrawn from their crayons whenever new ones arrive.
	$effect(() => {
		const f = together?.friendFills;
		if (friendCanvas && f && f.picture === picture.id) drawFills(friendCanvas, f.picture, f.n, f.fills);
	});
	$effect(() => {
		if (phase === 'gallery' && together?.shelf.length && !shelfSaid) {
			shelfSaid = true;
			say('paint.others');
		}
	});
	const friendView = $derived(!!together?.with && together.with.state !== 'invited' && together.with.state !== 'asking' && phase === 'paint');

	onMount(() => {
		language = loadLanguage();
		gallery = loadGallery();
		done = loadPainted();
		big = document.documentElement.dataset.mode !== 'little';
		const stop = trackPlay('paint');
		me = currentPlayer()?.avatar ?? 0;
		online = loadSettings().online;
		if (online) startTogether();
		fillsTimer = setInterval(sendFills, FILLS_MS);
		return () => {
			stop();
			clearInterval(fillsTimer);
			together?.stop();
			clearTimeout(doneTimer);
			pad?.destroy();
			stopSpeech();
		};
	});

	function outline(ctx: CanvasRenderingContext2D, width: number) {
		ctx.save();
		ctx.globalCompositeOperation = 'source-over';
		ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = width;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke(new Path2D(picture.d));
		ctx.restore();
	}

	const paperCtx = () => paper!.getContext('2d', { willReadFrequently: true })!;

	function remember() {
		undo.push(paperCtx().getImageData(0, 0, SIZE, SIZE));
		if (undo.length > UNDO_MAX) undo.shift();
		canUndo = true;
	}

	async function choose(p: Picture, tellFriend = true) {
		otherLine = null;
		asking = null;
		lastFills = '';
		if (tellFriend) together?.openPicture(p.id);
		picture = p;
		tool = 'brush';
		undo = [];
		canUndo = false;
		phase = 'paint';
		speak(pictureName(language, p), language);
		await tick();
		pad?.destroy();
		// Atrament sets the canvas size, which wipes it: create it before drawing the picture.
		pad = new Atrament(paper!, { width: SIZE, height: SIZE, color: crayon.hex });
		pad.adaptiveStroke = false;
		// One line width whatever the pressure: some touchscreens report none, which would draw a hairline.
		pad.pressureLow = 1;
		pad.pressureHigh = 1;
		pad.smoothing = 0.6;
		pad.mode = MODE_DRAW;
		const ctx = paperCtx();
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, SIZE, SIZE);
		outline(ctx, EDGE);
		const top = lines!.getContext('2d')!;
		top.clearRect(0, 0, SIZE, SIZE);
		outline(top, LINE);
		// Before every stroke or fill: keep a copy to undo to, and size the brush to the screen.
		pad.addEventListener('pointerdown', () => {
			remember();
			pad!.weight = (BRUSH * paper!.offsetWidth) / SIZE;
		});
		// A stroke over the outline would open a gap for the bucket: draw the edge back in.
		pad.addEventListener('strokeend', () => outline(paperCtx(), EDGE));
	}

	/** The bucket fills where the finger lands (Atrament's own fill uses the last pointer move). */
	function bucket(e: PointerEvent) {
		if (tool !== 'bucket' || !e.isPrimary) return;
		const x = Math.floor((e.offsetX * SIZE) / paper!.offsetWidth);
		const y = Math.floor((e.offsetY * SIZE) / paper!.offsetHeight);
		if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
		const ctx = paperCtx();
		const image = ctx.getImageData(0, 0, SIZE, SIZE);
		new FloodFill(image).fill(crayon.hex, x, y, TOLERANCE);
		ctx.putImageData(image, 0, 0);
		sfx.tok();
	}

	function pickCrayon(c: Crayon) {
		crayon = c;
		if (pad) pad.color = c.hex;
		speak(colour(language, c), language);
	}

	function pickTool(next: 'brush' | 'bucket') {
		tool = next;
		if (pad) pad.mode = next === 'brush' ? MODE_DRAW : MODE_DISABLED;
	}

	function back() {
		const last = undo.pop();
		if (last) paperCtx().putImageData(last, 0, 0);
		canUndo = undo.length > 0;
	}

	function finish() {
		const out = document.createElement('canvas');
		out.width = out.height = THUMB;
		const ctx = out.getContext('2d')!;
		ctx.drawImage(paper!, 0, 0, THUMB, THUMB);
		ctx.drawImage(lines!, 0, 0, THUMB, THUMB);
		finished = out.toDataURL('image/png');
		// What others see of it: one crayon per region, never the picture itself.
		const f = currentFills();
		if (f && together) {
			together.share(picture.id, f.n, f.fills);
			together.sendFills({ v: 1, picture: picture.id, ...f });
			together.sendDone(picture.id);
		}
		if (addToGallery(finished)) gallery = loadGallery();
		if (!done.includes(picture.id)) {
			done = [...done, picture.id];
			savePainted(done);
		}
		pad?.destroy();
		pad = null;
		undo = [];
		newSticker = awardSticker();
		// The reward says its own praise once mounted: let the picture's line finish first.
		let shown = false;
		const show = () => {
			if (shown) return;
			shown = true;
			clearTimeout(doneTimer);
			phase = 'done';
		};
		clearTimeout(doneTimer);
		doneTimer = setTimeout(show, 4000);
		speak(painted(language, picture), language, show);
	}

	function openChapter(c: Chapter) {
		chapter = c;
		otherLine = null;
		speak(chapterName(language, c), language);
	}

	function home() {
		pad?.destroy();
		pad = null;
		undo = [];
		stopSpeech();
		clearTimeout(doneTimer);
		viewing = '';
		otherLine = null;
		asking = null;
		together?.part();
		phase = 'start';
	}
</script>

{#snippet pic(p: Picture)}
	<svg viewBox="-4 -4 108 108" aria-hidden="true">
		<path d={p.d} fill="none" stroke="var(--ink)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/snippet}

<main>
	<header class="corner">
		{#if phase === 'start' && !chapter}
			<a class="icon" href={resolve('/home')} aria-label="All games"><Icon name="home" size={32} /></a>
			<Pip {language} line={otherLine ?? t(language, 'paint.go')} size={64} />
		{:else if phase === 'start' && chapter}
			<button type="button" class="icon" aria-label="All stories" onclick={() => { chapter = null; otherLine = null; }}><Icon name="home" size={32} /></button>
			<Pip {language} line={otherLine ?? chapterName(language, chapter)} size={64} />
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={home}><Icon name="home" size={32} /></button>
			{#if otherLine}<Pip {language} line={otherLine} size={56} />{/if}
		{/if}
		{#if phase === 'start'}
			<div class="strip-at">
				{#if together}<PresenceStrip {me} peers={together.peers} friends={together.online} {onFriend} />{/if}
				<button type="button" class="icon friends" aria-label="Paint with a friend" onclick={openTogether}>
					<Icon name="friends" size={34} />
					{#if together && Object.keys(together.online).length}
						<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3.1 1.8-2 3.3-3.1 5.4-3.1 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" /></svg>
					{/if}
				</button>
			</div>
		{/if}
	</header>

	<TogetherSheet
		bind:this={sheet}
		{language}
		{online}
		live={together?.online ?? {}}
		onOnline={setOnline}
		onInvite={inviteFromSheet}
		onAdded={friendAdded}
	/>

	{#if asking}
		<div class="ask" role="dialog" aria-label={otherLine?.text}>
			<button type="button" class="big yes" aria-label="Yes" onclick={() => answerAsk(true)}><Icon name="play" size={48} /></button>
			<button type="button" class="big no" aria-label="No" onclick={() => answerAsk(false)}><Icon name="close" size={36} /></button>
		</div>
	{/if}

	{#if phase === 'start'}
		<section class="stage">
			{#if chapter}
				<div class="pictures" role="group" aria-label="Pick a picture">
					{#each chapter.pictures as p (p.id)}
						<button type="button" class="card" aria-label={p.name[language]} onclick={() => choose(p)}>
							{@render pic(p)}
							{#if big}<span class="pname">{p.name[language]}</span>{/if}
							{#if done.includes(p.id)}<span class="star" aria-label="Painted"><Icon name="star" size={20} /></span>{/if}
						</button>
					{/each}
				</div>
			{:else}
				<div class="chapters" role="group" aria-label="Pick a story">
					{#each CHAPTERS as c, i (c.id)}
						{@const n = c.pictures.filter((p) => done.includes(p.id)).length}
						<button type="button" class="card chapter c{i % 4}" aria-label={c.name[language]} onclick={() => openChapter(c)}>
							<span class="cover">{@render pic(c.pictures[0])}{@render pic(c.pictures[1])}</span>
							{#if big}<span class="pname">{c.name[language]}</span>{/if}
							<span class="progress" aria-hidden="true">
								{#each c.pictures as p (p.id)}<i class:on={done.includes(p.id)}></i>{/each}
							</span>
							<span class="sr">{n} of {c.pictures.length}</span>
						</button>
					{/each}
				</div>
			{/if}
			<div class="row">
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
								speak(t(l.id, 'lang.name'), l.id);
							}}><Icon name={l.id} size={34} /></button
						>
					{/each}
				</div>
				<button type="button" class="flag" aria-label="My pictures" onclick={() => (phase = 'gallery')}><Icon name="book" size={34} /></button>
			</div>
		</section>
	{:else if phase === 'paint'}
		<section class="studio">
			<div class="tools" role="group" aria-label="Tools">
				<button type="button" class="tool" aria-label="Undo" disabled={!canUndo} onclick={back} ><Icon name="undo" size={32} /></button>
				<button type="button" class="tool" aria-label="Brush" aria-pressed={tool === 'brush'} onclick={() => pickTool('brush')}><Icon name="brush" size={32} /></button>
				<button type="button" class="tool" aria-label="Paint bucket" aria-pressed={tool === 'bucket'} onclick={() => pickTool('bucket')}><Icon name="bucket" size={32} /></button>
				<button type="button" class="tool ok" aria-label="Finished" onclick={finish}><Icon name="check" size={32} /></button>
			</div>
			<div class="board" class:fill={tool === 'bucket'}>
				<canvas bind:this={paper} width={SIZE} height={SIZE} onpointerdown={bucket} onpointermove={sendAt}></canvas>
				<canvas bind:this={lines} width={SIZE} height={SIZE} class="lines" aria-hidden="true"></canvas>
				{#if friendView}
					<div class="friend-view" class:away={together?.with?.state === 'away'} aria-label="Your friend's picture">
						<canvas bind:this={friendCanvas} width="200" height="200"></canvas>
						{#if together?.friendAt && !together.friendDone && together.with?.state === 'on'}
							<span class="dot" style="left: {together.friendAt.x * 100}%; top: {together.friendAt.y * 100}%">
								<Avatar avatar={together.with ? (together.online[together.with.key] ?? 0) : 0} size="100%" />
							</span>
						{/if}
						{#if together?.friendDone}<span class="star" aria-label="Finished"><Icon name="star" size={20} /></span>{/if}
					</div>
				{/if}
			</div>
			<div class="crayons" role="group" aria-label="Colours">
				{#each CRAYONS as c (c.id)}
					<button
						type="button"
						class="crayon"
						style="--c: {c.hex}"
						aria-label={c.name[language]}
						aria-pressed={crayon.id === c.id}
						onclick={() => pickCrayon(c)}
					></button>
				{/each}
			</div>
		</section>
	{:else if phase === 'done'}
		<section class="stage">
			<img class="framed small" src={finished} alt={picture.id} />
			<Reward grades={['gold']} sticker={newSticker} {language} onAgain={() => (phase = 'start')} />
		</section>
	{:else}
		<section class="stage">
			{#if viewing}
				<button type="button" class="framed-btn" aria-label="Close" onclick={() => (viewing = '')}>
					<img class="framed" src={viewing} alt="" />
				</button>
			{:else if gallery.length}
				<div class="gallery">
					{#each gallery as g, i (i)}
						<button type="button" class="card" aria-label="Picture {i + 1}" onclick={() => (viewing = g)}>
							<img src={g} alt="" />
						</button>
					{/each}
				</div>
			{:else}
				<div class="empty" aria-label="No pictures yet"><Icon name="book" size={96} /></div>
			{/if}
			{#if !viewing && together?.shelf.length}
				<div class="shelf" aria-label="Other children's pictures">
					{#if big}<span class="pname">{language === 'nl' ? 'Andere kinderen' : 'Other children'}</span>{/if}
					<div class="gallery">
						{#each together.shelf as p (p.id)}
							{@const url = pictureUrl(p.id, p.picture, p.n, p.fills)}
							{#if url}
								<button type="button" class="card" aria-label="A picture by another child" onclick={() => (viewing = url)}>
									<img src={url} alt="" />
								</button>
							{/if}
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}
</main>

<style>
	main {
		position: relative;
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: calc(var(--tap) + 2.5rem) 1rem 2rem;
		overflow: hidden;
		background: var(--butter);
	}
	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1.5rem, 5vh, 3rem);
		width: 100%;
	}
	.corner {
		position: absolute;
		top: 1rem;
		left: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	.strip-at {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.friends {
		position: relative;
		background: var(--sky);
	}
	.friends .heart {
		position: absolute;
		right: -6px;
		top: -6px;
		width: 26px;
		height: 26px;
		fill: var(--red);
		stroke: var(--ink);
		stroke-width: 2;
	}
	.ask {
		position: fixed;
		inset: auto 0 2rem 0;
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		z-index: 5;
	}
	.ask .big {
		width: calc(var(--tap) * 1.4);
		height: calc(var(--tap) * 1.4);
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		box-shadow: 0 6px 0 var(--ink);
		display: grid;
		place-items: center;
		color: var(--ink);
	}
	.ask .yes {
		background: var(--sun);
	}
	.ask .no {
		background: var(--white);
		width: var(--tap);
		height: var(--tap);
		align-self: center;
	}
	.friend-view {
		position: absolute;
		right: 0.5rem;
		bottom: 0.5rem;
		width: 28%;
		aspect-ratio: 1;
		border: 3px solid var(--ink);
		border-radius: 12px;
		background: var(--white);
		pointer-events: none;
		transition: opacity 300ms;
	}
	.friend-view canvas {
		width: 100%;
		height: 100%;
		border-radius: 9px;
	}
	.friend-view.away {
		opacity: 0.45;
	}
	.friend-view .dot {
		position: absolute;
		width: 26%;
		height: 26%;
		transform: translate(-50%, -50%);
		transition: left 100ms linear, top 100ms linear;
	}
	.shelf {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.8rem;
	}

	/* Keycaps: white, 4 px ink, a 6 px solid shadow that the press sinks into. */
	.icon,
	.flag,
	.card,
	.tool {
		border: var(--line) solid var(--ink);
		background: var(--white);
		box-shadow: 0 6px 0 var(--ink);
		color: inherit;
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.flag:active,
	.card:active,
	.tool:enabled:active {
		transform: translateY(6px);
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		flex: none;
		width: var(--tap);
		height: var(--tap);
		border-radius: 50%;
		line-height: 1;
		display: grid;
		place-items: center;
	}
	.flags {
		display: flex;
		gap: 2rem;
	}
	.flag {
		width: 5.5rem;
		height: 5.5rem;
		min-width: var(--tap);
		min-height: var(--tap);
		border-radius: 50%;
		display: grid;
		place-items: center;
	}
	.flag[aria-pressed='true'],
	.tool[aria-pressed='true'] {
		box-shadow: 0 6px 0 var(--ink), 0 0 0 6px var(--ink);
	}

	.pictures,
	.gallery {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: clamp(0.8rem, 2.5vw, 1.4rem);
		width: min(44rem, 94vw);
	}
	.card {
		aspect-ratio: 1;
		padding: 0.5rem;
		border-radius: 20px;
		display: grid;
		place-items: center;
	}
	.card {
		position: relative;
	}
	.star {
		position: absolute;
		top: -0.7rem;
		right: -0.7rem;
		width: 2.2rem;
		height: 2.2rem;
		border: 3px solid var(--ink);
		border-radius: 50%;
		background: var(--sun);
		display: grid;
		place-items: center;
		line-height: 1;
	}
	.chapters {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: clamp(1rem, 3vw, 1.8rem);
		width: min(40rem, 94vw);
	}
	.chapter {
		aspect-ratio: auto;
		padding: 0.8rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	/* Each story its own paper colour, from the app palette, so a pre-reader can find it again. */
	.chapter.c1 {
		background: #ffe9e4;
	}
	.chapter.c2 {
		background: #fff3c4;
	}
	.chapter.c3 {
		background: #e1ecf8;
	}
	.cover {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.3rem;
		width: 100%;
	}
	.cover :global(svg) {
		width: 100%;
		aspect-ratio: 1;
		display: block;
	}
	.progress {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: clamp(0.2rem, 1vw, 0.35rem);
	}
	.progress i {
		width: clamp(0.6rem, 2.6vw, 0.9rem);
		height: clamp(0.6rem, 2.6vw, 0.9rem);
		border: 2px solid var(--ink);
		border-radius: 50%;
		background: var(--white);
	}
	.progress i.on {
		background: var(--sun);
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
	}
	.pname {
		font-family: var(--title);
		font-weight: 700;
		font-size: 1.1rem;
		line-height: 1.1;
		text-align: center;
	}
	.card :global(svg),
	.card img {
		width: 100%;
		height: 100%;
		display: block;
	}
	.card img {
		border-radius: 10px;
	}
	.empty {
		line-height: 0;
		opacity: 0.35;
	}

	.studio {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}
	.tools {
		display: flex;
		gap: 1rem;
	}
	.tool {
		width: max(4.2rem, var(--tap));
		height: max(4.2rem, var(--tap));
		border-radius: 18px;
		line-height: 1;
		display: grid;
		place-items: center;
	}
	.tool:disabled {
		opacity: 0.35;
		cursor: default;
	}
	.tool.ok {
		background: var(--leaf);
		color: var(--white);
	}
	/* Square board as big as the screen allows, leaving room for tools and crayons. */
	.board {
		position: relative;
		width: min(94vw, calc(100dvh - 2 * var(--tap) - 14rem), 42rem);
		aspect-ratio: 1;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		overflow: hidden;
		background: var(--white);
		cursor: crosshair;
	}
	.board.fill {
		cursor: cell;
	}
	.board canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.board .lines {
		pointer-events: none;
	}
	.crayons {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: min(0.7rem, 1vw);
		max-width: 100%;
	}
	.crayon {
		/* Nine in a row: as big as the mode asks, unless the screen is narrower than that. */
		--crayon: min(var(--tap), 7.8vw);
		width: var(--crayon);
		height: var(--crayon);
		min-width: 3.2rem;
		min-height: 3.2rem;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 6px 0 var(--ink);
		transition: transform 120ms;
	}
	.crayon[aria-pressed='true'] {
		transform: translateY(-6px);
		box-shadow: 0 6px 0 var(--ink), 0 0 0 5px var(--white), 0 0 0 9px var(--ink);
	}

	.framed {
		width: min(80vw, calc(100dvh - 16rem), 30rem);
		aspect-ratio: 1;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		box-shadow: 0 8px 0 var(--ink);
		display: block;
	}
	.framed.small {
		width: min(40vw, 16rem);
	}
	.framed-btn {
		padding: 0;
		border: 0;
		background: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.icon,
		.flag,
		.card,
		.tool,
		.crayon {
			transition: none;
		}
	}
</style>
