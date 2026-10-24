<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import Atrament, { MODE_DISABLED, MODE_DRAW } from 'atrament';
	import FloodFill from 'q-floodfill';
	import { speak, stopSpeech, sfx } from '#lib/audio.ts';
	import { CRAYONS, PICTURES, type Crayon, type Picture } from '#lib/paint.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import { colour, painted, t } from '#lib/i18n.ts';
	import { addToGallery, loadGallery, loadLanguage, saveLanguage } from '#lib/storage.ts';

	const SIZE = 800; // canvas bitmap; CSS scales it to the screen
	const SCALE = SIZE / 100; // picture paths are drawn on a 100×100 grid
	const BRUSH = 34; // brush width in bitmap pixels, whatever the screen size
	// The outline the bucket stops at, and a thicker copy on top that hides the fill's soft edge against it.
	const EDGE = 1.2;
	const LINE = 1.8;
	const TOLERANCE = 48; // per colour channel: a fill also takes the soft edges of brush strokes
	const UNDO_MAX = 8;
	const THUMB = 320; // gallery pictures, in pixels

	let phase = $state<'start' | 'paint' | 'done' | 'gallery'>('start');
	let language = $state<Language>('en');
	let picture = $state<Picture>(PICTURES[0]);
	let crayon = $state<Crayon>(CRAYONS[0]);
	let tool = $state<'brush' | 'bucket'>('brush');
	let canUndo = $state(false);
	let finished = $state('');
	let gallery = $state<string[]>([]);
	let viewing = $state('');

	let paper = $state<HTMLCanvasElement>();
	let lines = $state<HTMLCanvasElement>();
	let pad: Atrament | null = null;
	let undo: ImageData[] = [];

	onMount(() => {
		language = loadLanguage();
		gallery = loadGallery();
		return () => {
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

	async function choose(p: Picture) {
		picture = p;
		tool = 'brush';
		undo = [];
		canUndo = false;
		phase = 'paint';
		speak(t(language, 'paint.go'), language);
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
		if (addToGallery(finished)) gallery = loadGallery();
		pad?.destroy();
		pad = null;
		undo = [];
		phase = 'done';
		sfx.chime();
		speak(painted(language, picture), language);
	}

	function home() {
		pad?.destroy();
		pad = null;
		undo = [];
		stopSpeech();
		viewing = '';
		phase = 'start';
	}
</script>

{#snippet pic(p: Picture)}
	<svg viewBox="-4 -4 108 108" aria-hidden="true">
		<path d={p.d} fill="none" stroke="var(--ink)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/snippet}

<main>
	<div class="corner left">
		{#if phase === 'start'}
			<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={home}>⌂</button>
		{/if}
	</div>

	{#if phase === 'start'}
		<section class="stage">
			<div class="pictures" role="group" aria-label="Pick a picture">
				{#each PICTURES as p (p.id)}
					<button type="button" class="card" aria-label={p.id} onclick={() => choose(p)}>{@render pic(p)}</button>
				{/each}
			</div>
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
							}}>{l.flag}</button
						>
					{/each}
				</div>
				<button type="button" class="flag" aria-label="My pictures" onclick={() => (phase = 'gallery')}>🖼️</button>
			</div>
		</section>
	{:else if phase === 'paint'}
		<section class="studio">
			<div class="tools" role="group" aria-label="Tools">
				<button type="button" class="tool" aria-label="Undo" disabled={!canUndo} onclick={back}>↶</button>
				<button type="button" class="tool" aria-label="Brush" aria-pressed={tool === 'brush'} onclick={() => pickTool('brush')}>🖌️</button>
				<button type="button" class="tool" aria-label="Paint bucket" aria-pressed={tool === 'bucket'} onclick={() => pickTool('bucket')}>🪣</button>
				<button type="button" class="tool ok" aria-label="Finished" onclick={finish}>✓</button>
			</div>
			<div class="board" class:fill={tool === 'bucket'}>
				<canvas bind:this={paper} width={SIZE} height={SIZE} onpointerdown={bucket}></canvas>
				<canvas bind:this={lines} width={SIZE} height={SIZE} class="lines" aria-hidden="true"></canvas>
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
			<img class="framed" src={finished} alt={picture.id} />
			<div class="row">
				<button type="button" class="big-btn play" aria-label="Paint another" onclick={() => (phase = 'start')}>▶</button>
				<button type="button" class="flag" aria-label="My pictures" onclick={() => (phase = 'gallery')}>🖼️</button>
			</div>
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
				<div class="empty" aria-label="No pictures yet">🖼️</div>
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
		padding: 5.5rem 1rem 2rem;
		overflow: hidden;
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
	}
	.row {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.icon,
	.big-btn,
	.flag,
	.card,
	.tool {
		border: var(--line) solid var(--ink);
		background: var(--paper);
		box-shadow: 0 var(--line) 0 var(--ink);
		color: inherit;
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.big-btn:active,
	.flag:active,
	.card:active,
	.tool:enabled:active {
		transform: translateY(var(--line));
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		font-size: 1.9rem;
		line-height: 1;
		display: grid;
		place-items: center;
	}
	.big-btn {
		border-radius: 22px;
		display: grid;
		place-items: center;
		line-height: 1;
	}
	.play {
		width: clamp(6rem, 22vw, 9rem);
		height: clamp(6rem, 22vw, 9rem);
		background: var(--sun);
		font-size: clamp(3rem, 9vw, 4.5rem);
		padding-left: 0.3em;
	}
	.flags {
		display: flex;
		gap: 2rem;
	}
	.flag {
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		font-size: 2.4rem;
	}
	.flag[aria-pressed='true'],
	.tool[aria-pressed='true'] {
		box-shadow: 0 var(--line) 0 var(--ink), 0 0 0 6px var(--ink);
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
		font-size: 6rem;
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
		width: 4.2rem;
		height: 4.2rem;
		border-radius: 18px;
		font-size: 2rem;
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
		color: var(--paper);
		font-weight: 700;
	}
	/* Square board as big as the screen allows, leaving room for tools and crayons. */
	.board {
		position: relative;
		width: min(94vw, calc(100dvh - 19rem), 42rem);
		aspect-ratio: 1;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		overflow: hidden;
		background: var(--paper);
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
		gap: 0.7rem;
		max-width: 42rem;
	}
	.crayon {
		width: clamp(3.2rem, 10vw, 4rem);
		height: clamp(3.2rem, 10vw, 4rem);
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 var(--line) 0 var(--ink);
		transition: transform 120ms;
	}
	.crayon[aria-pressed='true'] {
		transform: translateY(-6px);
		box-shadow: 0 var(--line) 0 var(--ink), 0 0 0 5px var(--paper), 0 0 0 9px var(--ink);
	}

	.framed {
		width: min(80vw, calc(100dvh - 16rem), 30rem);
		aspect-ratio: 1;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		box-shadow: 0 8px 0 var(--ink);
		display: block;
	}
	.framed-btn {
		padding: 0;
		border: 0;
		background: none;
	}
</style>
