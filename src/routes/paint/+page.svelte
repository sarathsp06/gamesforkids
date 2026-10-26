<script lang="ts">
	import { flushSync, onMount, tick } from 'svelte';
	import { resolve } from '$app/paths';
	import Atrament, { MODE_DISABLED, MODE_DRAW } from 'atrament';
	import FloodFill from 'q-floodfill';
	import { speak, stopSpeech, sfx } from '#lib/audio.ts';
	import { BLANK, CHAPTERS, CRAYONS, PICTURES, STAMPS, type Chapter, type Crayon, type Picture, type Stamp } from '#lib/paint.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import { chapterName, colour, painted, pictureName, stampName, t } from '#lib/i18n.ts';
	import { addToGallery, loadGallery, removeFromGallery, loadLanguage, loadPainted, saveLanguage, savePainted } from '#lib/storage.ts';
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

	// The paper fills the window: its bitmap is SIZE on the short side and as long as the window on the other, up to
	// ASPECT_MAX times as long. Sharp enough to zoom into.
	const SIZE = 1200;
	const ASPECT_MAX = 2.4;
	const BRUSH = 51; // brush width in bitmap pixels at no zoom, whatever the screen size
	const STAMP_LINE = 18; // a shape's outline, in bitmap pixels at no zoom
	const STAMP_SIZE = 0.22; // a tapped shape, as a share of what the board shows
	const ZOOM_MAX = 4;
	const ZOOM_STEP = 1.5; // one tap of the zoom buttons
	// The outline the bucket stops at, and a thicker copy on top that hides the fill's soft edge against it.
	const EDGE = 1.2;
	const LINE = 1.8;
	const TOLERANCE = 48; // per colour channel: a fill also takes the soft edges of brush strokes
	const UNDO_MAX = 8;
	const THUMB = 480; // gallery pictures, in pixels on their longer side
	const FILLS_MS = 3000; // how often a friend painting alongside sees this picture's colours
	const AT_MS = 100; // and this crayon's position
	const FILLS_AGAIN_MS = 9000; // the same colours again, in case a message was lost

	let phase = $state<'start' | 'paint' | 'done' | 'gallery'>('start');
	/** The story whose pictures are shown; none: the list of chapters. */
	let chapter = $state<Chapter | null>(null);
	let done = $state<string[]>([]);
	let language = $state<Language>('en');
	let picture = $state<Picture>(PICTURES[0]);
	let crayon = $state<Crayon>(CRAYONS[0]);
	let tool = $state<'brush' | 'bucket' | 'shape'>('brush');
	let stamp = $state<Stamp>(STAMPS[0]);
	/** The row of shapes to pick from, open over the top of the board. */
	let tray = $state(false);
	/** A shape being dragged out: where it started, in bitmap and in screen pixels. */
	let drag: { x: number; y: number; sx: number; sy: number } | null = null;
	let canUndo = $state(false);
	let finished = $state('');
	let gallery = $state<string[]>([]);
	let viewing = $state('');
	/** The child's own picture being viewed, by its place in the gallery; -1: another child's picture. */
	let viewingAt = $state(-1);
	/** The bin was tapped: asking whether to throw the picture away. */
	let confirming = $state(false);
	/** Big mode shows the name under each picture and chapter; Little mode shows pictures only. */
	let big = $state(false);
	let newSticker = $state('');
	/** Fallback that shows the reward if the finished-picture speech never reports its end. */
	let doneTimer: ReturnType<typeof setTimeout> | undefined;

	let paper = $state<HTMLCanvasElement>();
	let lines = $state<HTMLCanvasElement>();
	/** Scrolls the page when it is zoomed in: two fingers, a trackpad or the mouse wheel move it around. */
	let scroller = $state<HTMLDivElement>();
	let page = $state<HTMLDivElement>();
	let toolbar = $state<HTMLDivElement>();
	let palette = $state<HTMLDivElement>();
	/** The paper's bitmap, and its size on the screen at no zoom. */
	let w = $state(SIZE);
	let h = $state(SIZE);
	let fit = $state({ w: 0, h: 0 });
	/** Where the picture's 100×100 grid sits on the paper, in bitmap pixels: clear of the tools. */
	let at = { x: 0, y: 0, s: SIZE };
	let zoom = $state(1);
	/** Fingers on the board, by pointer id: two make a pinch, which zooms and moves the page instead of painting. */
	const touches = new Map<number, { x: number; y: number }>();
	/** The pinch under way: the zoom it started at, the distance between the fingers then, and the page point under them. */
	let pinch: { zoom: number; dist: number; x: number; y: number } | null = null;
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
	let lastFillsAt = 0;
	let lastAt = 0;
	let fillsTimer: ReturnType<typeof setInterval> | undefined;
	const screen = $derived(phase === 'paint' ? 'paint' : chapter ? 'pictures' : 'chapters');
	$effect(() => together?.setScreen(screen));

	function say(
		key: 'paint.others' | 'paint.delete' | 'friend.here' | 'friend.ask' | 'friend.wants' | 'friend.yes' | 'friend.no' | 'friend.finished' | 'friend.away' | 'friend.how' | 'friend.pick'
	) {
		otherLine = t(language, key);
		speak(otherLine, language);
	}

	function heard(e: TogetherEvent, data?: string) {
		if (e === 'friendHere' && phase === 'start') say('friend.here');
		else if (e === 'invited') {
			asking = { kind: 'wants' };
			say('friend.wants');
		} else if (e === 'accepted') {
			say('friend.yes');
			// Already on a picture while the yes was on its way: bring the friend to it.
			if (phase === 'paint') together?.openPicture(picture.id);
		}
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
		return r && paper ? { n: r.count, fills: fillsOf(paper, r, at) } : null;
	}
	function sendFills() {
		if (!together?.painting || phase !== 'paint') return;
		const f = currentFills();
		if (!f) return;
		const key = JSON.stringify(f.fills);
		// Unchanged colours go again now and then: a message lost on the way never leaves the friend's view stale.
		if (key === lastFills && Date.now() - lastFillsAt < FILLS_AGAIN_MS) return;
		lastFills = key;
		lastFillsAt = Date.now();
		together.sendFills({ v: 1, picture: picture.id, ...f });
	}
	function sendAt(e: PointerEvent) {
		if (!together?.painting || !e.isPrimary || Date.now() - lastAt < AT_MS) return;
		lastAt = Date.now();
		// Where on the picture, not the paper: the friend's copy is just the picture.
		const x = ((e.offsetX * w) / paper!.offsetWidth - at.x) / at.s;
		const y = ((e.offsetY * h) / paper!.offsetHeight - at.y) / at.s;
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
		ctx.setTransform(at.s / 100, 0, 0, at.s / 100, at.x, at.y);
		ctx.strokeStyle = '#000000';
		ctx.lineWidth = width;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke(new Path2D(picture.d));
		ctx.restore();
	}

	const paperCtx = () => paper!.getContext('2d', { willReadFrequently: true })!;

	function remember() {
		undo.push(paperCtx().getImageData(0, 0, w, h));
		if (undo.length > UNDO_MAX) undo.shift();
		canUndo = true;
	}

	async function choose(p: Picture, tellFriend = true) {
		otherLine = null;
		asking = null;
		lastFills = '';
		// Blank paper is the child's own drawing: nothing of it goes to a friend.
		if (tellFriend && p.id !== BLANK.id) together?.openPicture(p.id);
		picture = p;
		tool = 'brush';
		tray = false;
		drag = null;
		undo = [];
		canUndo = false;
		zoom = 1;
		touches.clear();
		pinch = null;
		phase = 'paint';
		speak(pictureName(language, p), language);
		await tick();
		pad?.destroy();
		// Atrament sets the canvas size, which wipes it: create it before drawing the picture.
		layout();
		// The canvases take their new size now: resizing one later would wipe what is drawn on it.
		flushSync();
		pad = new Atrament(paper!, { width: w, height: h, color: crayon.hex });
		pad.adaptiveStroke = false;
		// One line width whatever the pressure: some touchscreens report none, which would draw a hairline.
		pad.pressureLow = 1;
		pad.pressureHigh = 1;
		pad.smoothing = 0.6;
		pad.mode = MODE_DRAW;
		const ctx = paperCtx();
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, w, h);
		outline(ctx, EDGE);
		const top = lines!.getContext('2d')!;
		top.clearRect(0, 0, w, h);
		outline(top, LINE);
		// Before every stroke or fill: keep a copy to undo to, and size the brush to the screen.
		pad.addEventListener('pointerdown', () => {
			remember();
			pad!.weight = (BRUSH * paper!.offsetWidth) / w / zoom;
		});
		// A stroke over the outline would open a gap for the bucket: draw the edge back in.
		pad.addEventListener('strokeend', () => outline(paperCtx(), EDGE));
	}

	/** The bucket fills where the finger lands (Atrament's own fill uses the last pointer move). */
	function bucket(e: PointerEvent) {
		if (tool !== 'bucket' || !e.isPrimary) return;
		const x = Math.floor((e.offsetX * w) / paper!.offsetWidth);
		const y = Math.floor((e.offsetY * h) / paper!.offsetHeight);
		if (x < 0 || y < 0 || x >= w || y >= h) return;
		const ctx = paperCtx();
		const image = ctx.getImageData(0, 0, w, h);
		new FloodFill(image).fill(crayon.hex, x, y, TOLERANCE);
		ctx.putImageData(image, 0, 0);
		sfx.tok();
	}

	function pickCrayon(c: Crayon) {
		crayon = c;
		if (pad) pad.color = c.hex;
		speak(colour(language, c), language);
	}

	function pickTool(next: 'brush' | 'bucket' | 'shape') {
		tool = next;
		tray = false;
		if (pad) pad.mode = next === 'brush' ? MODE_DRAW : MODE_DISABLED;
	}

	/** The shapes button: the first tap picks the tool and opens the shapes; another opens or closes them. */
	function shapesTool() {
		if (tool === 'shape') tray = !tray;
		else {
			pickTool('shape');
			tray = true;
		}
	}

	function pickStamp(s: Stamp) {
		stamp = s;
		tray = false;
		speak(stampName(language, s), language);
	}

	/** The shape in bitmap pixels, from where the drag started to where it is now. */
	function stampPath(s: Stamp, x0: number, y0: number, x1: number, y1: number) {
		let w = x1 - x0;
		let h = y1 - y0;
		if (s.fit === 'even') {
			const k = Math.max(Math.abs(w), Math.abs(h));
			w = Math.sign(w || 1) * k;
			h = Math.sign(h || 1) * k;
		}
		// Dragged up or left: the same shape the other way round, never upside down. A line just follows the finger.
		if (s.fit !== 'ends') {
			x0 = Math.min(x0, x0 + w);
			y0 = Math.min(y0, y0 + h);
			w = Math.abs(w);
			h = Math.abs(h);
		}
		const p = new Path2D();
		p.addPath(new Path2D(s.d), new DOMMatrix([w / 100, 0, 0, h / 100, x0, y0]));
		return p;
	}

	/** Draw a shape's outline in the crayon: thinner when zoomed in, like the brush. */
	function drawStamp(ctx: CanvasRenderingContext2D, path: Path2D) {
		ctx.save();
		ctx.strokeStyle = crayon.hex;
		ctx.lineWidth = STAMP_LINE / zoom;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.stroke(path);
		ctx.restore();
	}

	/** The top canvas: the picture's outline, and the shape being dragged out, if any. */
	function redrawTop(preview?: Path2D) {
		const top = lines!.getContext('2d')!;
		top.clearRect(0, 0, w, h);
		if (preview) drawStamp(top, preview);
		outline(top, LINE);
	}

	const bitmap = (e: PointerEvent) => [(e.offsetX * w) / paper!.offsetWidth, (e.offsetY * h) / paper!.offsetHeight];

	function paperDown(e: PointerEvent) {
		bucket(e);
		if (tool !== 'shape' || !e.isPrimary) return;
		tray = false;
		const [x, y] = bitmap(e);
		drag = { x, y, sx: e.clientX, sy: e.clientY };
		// Keep following the drag when it runs off the edge of the paper.
		paper!.setPointerCapture(e.pointerId);
	}

	function paperMove(e: PointerEvent) {
		sendAt(e);
		if (!drag || !e.isPrimary) return;
		const [x, y] = bitmap(e);
		redrawTop(stampPath(stamp, drag.x, drag.y, x, y));
	}

	function paperUp(e: PointerEvent) {
		if (!drag || !e.isPrimary) return;
		const d = drag;
		drag = null;
		let [x, y] = bitmap(e);
		let x0 = d.x;
		let y0 = d.y;
		// A tap, not a drag: a ready-made shape around the finger, the same size on screen whatever the zoom.
		if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 12) {
			const r = (Math.min(w, h) * STAMP_SIZE) / zoom / 2;
			const rw = stamp.fit === 'stretch' ? r * 1.5 : r;
			[x0, y0, x, y] = stamp.fit === 'ends' ? [d.x - r, d.y, d.x + r, d.y] : [d.x - rw, d.y - r, d.x + rw, d.y + r];
		}
		drawStamp(paperCtx(), stampPath(stamp, x0, y0, x, y));
		// The shape may cross the picture's lines: draw the edge back in, as after a brush stroke.
		outline(paperCtx(), EDGE);
		redrawTop();
		sfx.tok();
	}

	function paperCancel() {
		if (!drag) return;
		drag = null;
		redrawTop();
	}

	function back() {
		const last = undo.pop();
		if (last) paperCtx().putImageData(last, 0, 0);
		canUndo = undo.length > 0;
	}

	function finish() {
		const out = document.createElement('canvas');
		const k = THUMB / Math.max(w, h);
		out.width = Math.round(w * k);
		out.height = Math.round(h * k);
		const ctx = out.getContext('2d')!;
		ctx.drawImage(paper!, 0, 0, out.width, out.height);
		ctx.drawImage(lines!, 0, 0, out.width, out.height);
		finished = out.toDataURL('image/png');
		// What others see of it: one crayon per region, never the picture itself.
		const f = currentFills();
		if (f && together) {
			together.share(picture.id, f.n, f.fills);
			together.sendFills({ v: 1, picture: picture.id, ...f });
			together.sendDone(picture.id);
		}
		if (addToGallery(finished)) gallery = loadGallery();
		// Blank paper is never done: the child can draw on a fresh one as often as they like.
		if (picture.id !== BLANK.id && !done.includes(picture.id)) {
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

	/** The paper's size on the screen: as big as the window, keeping its shape. */
	function contain() {
		const cw = scroller!.clientWidth;
		const ch = scroller!.clientHeight;
		return cw / ch > w / h ? { w: (ch * w) / h, h: ch } : { w: cw, h: (cw * h) / w };
	}

	/**
	 * Sizes the paper to the window, and finds the picture's place on it: the biggest square clear of the tools down
	 * the side and the crayons along the bottom, in the middle of the window where it fits. The child can still paint
	 * anywhere on the paper.
	 */
	function layout() {
		const cw = scroller!.clientWidth;
		const ch = scroller!.clientHeight;
		const a = Math.min(Math.max(cw, ch) / Math.min(cw, ch), ASPECT_MAX);
		[w, h] = cw >= ch ? [Math.round(SIZE * a), SIZE] : [SIZE, Math.round(SIZE * a)];
		fit = contain();
		const box = scroller!.getBoundingClientRect();
		const ox = box.left + (cw - fit.w) / 2;
		const oy = box.top + (ch - fit.h) / 2;
		const m = 16;
		const left = Math.max(m, toolbar!.getBoundingClientRect().right - ox + m);
		const right = fit.w - m;
		const top = m;
		const bottom = Math.min(fit.h - m, palette!.getBoundingClientRect().top - oy - m);
		const side = Math.max(100, Math.min(right - left, bottom - top));
		const x = Math.min(Math.max(fit.w / 2 - side / 2, left), right - side);
		const y = top + (bottom - top - side) / 2;
		const k = w / fit.w;
		at = { x: x * k, y: y * k, s: side * k };
	}

	/** The window turned or resized: the paper keeps its bitmap and only scales to the new window. */
	function refit() {
		if (phase === 'paint' && scroller) fit = contain();
	}

	const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(1, z));

	/** Zoom to `next`, keeping page point (x, y), in unzoomed board pixels, under board point (px, py). */
	function place(next: number, x: number, y: number, px: number, py: number) {
		zoom = clampZoom(next);
		// The page must have its new size before it can scroll that far.
		flushSync();
		scroller!.scrollLeft = page!.offsetLeft + x * zoom - px;
		scroller!.scrollTop = page!.offsetTop + y * zoom - py;
	}

	/** Zoom around a point on the screen: the cursor, the fingers, or the middle of the board for the buttons. */
	function zoomAt(next: number, clientX?: number, clientY?: number) {
		const r = scroller!.getBoundingClientRect();
		const px = (clientX ?? r.left + r.width / 2) - r.left;
		const py = (clientY ?? r.top + r.height / 2) - r.top;
		place(next, (scroller!.scrollLeft + px - page!.offsetLeft) / zoom, (scroller!.scrollTop + py - page!.offsetTop) / zoom, px, py);
	}

	function fingers() {
		const [a, b] = [...touches.values()];
		return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
	}

	function touchDown(e: PointerEvent) {
		if (e.pointerType !== 'touch') return;
		touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (touches.size !== 2 || pinch) return;
		// A second finger: this is a pinch, not paint. Take back what the first finger already did.
		if (pad) pad.mode = MODE_DISABLED;
		back();
		paperCancel();
		const f = fingers();
		const r = scroller!.getBoundingClientRect();
		pinch = {
			zoom,
			dist: f.dist,
			x: (scroller!.scrollLeft + f.x - r.left - page!.offsetLeft) / zoom,
			y: (scroller!.scrollTop + f.y - r.top - page!.offsetTop) / zoom
		};
	}

	function touchMove(e: PointerEvent) {
		if (!touches.has(e.pointerId)) return;
		touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (!pinch || touches.size < 2) return;
		const f = fingers();
		const r = scroller!.getBoundingClientRect();
		// Spread or close the fingers to zoom; move them together to slide the page along.
		place((pinch.zoom * f.dist) / pinch.dist, pinch.x, pinch.y, f.x - r.left, f.y - r.top);
	}

	function touchUp(e: PointerEvent) {
		if (!touches.delete(e.pointerId) || touches.size) return;
		// Paint again only once every finger is off, so the one left behind doesn't scribble.
		if (pinch && pad) pad.mode = tool === 'brush' ? MODE_DRAW : MODE_DISABLED;
		pinch = null;
	}

	// A trackpad pinch (ctrl + wheel in Chrome and Firefox, gesture events in Safari) zooms; plain scrolling pans.
	$effect(() => {
		const s = scroller;
		if (!s) return;
		let start = 1;
		const wheel = (e: WheelEvent) => {
			if (!e.ctrlKey) return;
			e.preventDefault();
			zoomAt(zoom * Math.exp(-e.deltaY * 0.01), e.clientX, e.clientY);
		};
		const gestureStart = (e: Event) => {
			e.preventDefault();
			start = zoom;
		};
		const gestureChange = (e: Event) => {
			e.preventDefault();
			const g = e as Event & { scale: number; clientX: number; clientY: number };
			zoomAt(start * g.scale, g.clientX, g.clientY);
		};
		s.addEventListener('wheel', wheel, { passive: false });
		s.addEventListener('gesturestart', gestureStart);
		s.addEventListener('gesturechange', gestureChange);
		return () => {
			s.removeEventListener('wheel', wheel);
			s.removeEventListener('gesturestart', gestureStart);
			s.removeEventListener('gesturechange', gestureChange);
		};
	});

	/** A picture's own shape, so the frame can scale it up to the screen whatever shape the window was. */
	function shape(e: Event) {
		const img = e.currentTarget as HTMLImageElement;
		img.style.setProperty('--r', String(img.naturalWidth / img.naturalHeight));
	}

	function view(url: string, at: number) {
		viewing = url;
		viewingAt = at;
		confirming = false;
	}
	function closeView() {
		viewing = '';
		viewingAt = -1;
		confirming = false;
		otherLine = null;
	}
	/** Throwing a picture away is asked first: one stray tap shouldn't lose it. */
	function askRemove() {
		confirming = true;
		say('paint.delete');
	}
	function removePicture() {
		removeFromGallery(viewingAt);
		gallery = loadGallery();
		sfx.tok();
		closeView();
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
		closeView();
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

{#snippet stampPic(s: Stamp)}
	<svg class="stamp" viewBox="-10 -10 120 120" aria-hidden="true">
		<path d={s.icon ?? s.d} fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
{/snippet}

<svelte:window onresize={refit} />

<main class:full={phase === 'paint'}>
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
					<button type="button" class="card chapter blank" aria-label={BLANK.name[language]} onclick={() => choose(BLANK)}>
						<Icon name="draw" size={56} />
						{#if big}<span class="pname">{language === 'nl' ? 'Tekenen' : 'Draw'}</span>{/if}
					</button>
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
			<div class="tools" role="group" aria-label="Tools" bind:this={toolbar}>
				<button type="button" class="tool" aria-label="Undo" disabled={!canUndo} onclick={back} ><Icon name="undo" size={32} /></button>
				<button type="button" class="tool" aria-label="Brush" aria-pressed={tool === 'brush'} onclick={() => pickTool('brush')}><Icon name="brush" size={32} /></button>
				<button type="button" class="tool" aria-label="Paint bucket" aria-pressed={tool === 'bucket'} onclick={() => pickTool('bucket')}><Icon name="bucket" size={32} /></button>
				<button type="button" class="tool" aria-label="Shapes" aria-pressed={tool === 'shape'} aria-expanded={tray} onclick={shapesTool}>{@render stampPic(stamp)}</button>
				<button type="button" class="tool" aria-label="Zoom in" disabled={zoom >= ZOOM_MAX} onclick={() => zoomAt(zoom * ZOOM_STEP)}><Icon name="zoomIn" size={32} /></button>
				<button type="button" class="tool" aria-label="Zoom out" disabled={zoom <= 1} onclick={() => zoomAt(zoom / ZOOM_STEP)}><Icon name="zoomOut" size={32} /></button>
				<button type="button" class="tool ok" aria-label="Finished" onclick={finish}><Icon name="check" size={32} /></button>
			</div>
			<div class="board" class:fill={tool === 'bucket'} role="application" aria-label="Picture" onpointerdown={touchDown} onpointermove={touchMove} onpointerup={touchUp} onpointercancel={touchUp}>
				<div class="scroll" bind:this={scroller}>
					<div class="page" bind:this={page} style="width: {fit.w * zoom}px; height: {fit.h * zoom}px">
						<canvas
							bind:this={paper}
							width={w}
							height={h}
							onpointerdown={paperDown}
							onpointermove={paperMove}
							onpointerup={paperUp}
							onpointercancel={paperCancel}
						></canvas>
						<canvas bind:this={lines} width={w} height={h} class="lines" aria-hidden="true"></canvas>
					</div>
				</div>
				{#if tray}
					<div class="tray" role="group" aria-label="Pick a shape">
						{#each STAMPS as s (s.id)}
							<button type="button" class="tool" aria-label={s.name[language]} aria-pressed={stamp.id === s.id} onclick={() => pickStamp(s)}>{@render stampPic(s)}</button>
						{/each}
					</div>
				{/if}
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
			<div class="crayons" role="group" aria-label="Colours" bind:this={palette}>
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
				<button type="button" class="framed-btn" aria-label="Close" onclick={closeView}>
					<img class="framed" src={viewing} alt="" onload={shape} />
				</button>
				{#if viewingAt >= 0}
					<div class="row">
						{#if confirming}
							<button type="button" class="flag bin" aria-label="Yes, throw it away" onclick={removePicture}><Icon name="trash" size={34} /></button>
							<button type="button" class="flag" aria-label="No, keep it" onclick={() => { confirming = false; otherLine = null; }}><Icon name="close" size={34} /></button>
						{:else}
							<button type="button" class="flag" aria-label="Throw it away" onclick={askRemove}><Icon name="trash" size={34} /></button>
						{/if}
					</div>
				{/if}
			{:else if gallery.length}
				<div class="gallery">
					{#each gallery as g, i (i)}
						<button type="button" class="card" aria-label="Picture {i + 1}" onclick={() => view(g, i)}>
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
								<button type="button" class="card" aria-label="A picture by another child" onclick={() => view(url, -1)}>
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
		/* Above the paper while painting. */
		z-index: 3;
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
		top: 1rem;
		right: 1rem;
		z-index: 2;
		width: min(24vw, 13rem);
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
	.flag.bin {
		background: var(--red);
		color: var(--white);
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
		object-fit: contain;
	}
	.empty {
		line-height: 0;
		opacity: 0.35;
	}

	/* Painting: the paper is the whole window, with the tools down the left and the crayons along the bottom on top. */
	main.full {
		padding: 0;
	}
	.studio {
		position: fixed;
		inset: 0;
	}
	.tools {
		position: absolute;
		top: calc(var(--tap) + 2rem);
		left: 1rem;
		z-index: 2;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}
	.tool {
		/* Seven keys between the home button and the crayons: smaller when the window is short. */
		--key: min(max(4.2rem, var(--tap)), calc((100dvh - 2 * var(--tap) - 6rem) / 7 - 0.8rem));
		width: var(--key);
		height: var(--key);
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
	.board {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: var(--butter);
		cursor: crosshair;
		/* Pinching zooms the picture, not the page. */
		touch-action: none;
	}
	.board.fill {
		cursor: cell;
	}
	.stamp {
		width: 2rem;
		height: 2rem;
	}
	/* The shapes, open along the top of the paper. */
	.tray {
		position: absolute;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.6rem;
		width: max-content;
		max-width: calc(100% - 2 * var(--tap) - 4rem);
		padding: 0.6rem 0.6rem 1rem;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		background: var(--butter);
		cursor: default;
	}
	.scroll {
		position: absolute;
		inset: 0;
		display: flex;
		overflow: auto;
		overscroll-behavior: contain;
		/* No scroll bars: two fingers, a trackpad or the wheel move the paper. */
		scrollbar-width: none;
	}
	.scroll::-webkit-scrollbar {
		display: none;
	}
	.page {
		position: relative;
		flex: none;
		/* Centred when smaller than the window (after turning it), and still scrolls to every edge when zoomed. */
		margin: auto;
		background: var(--white);
	}
	.page canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.page .lines {
		pointer-events: none;
	}
	.crayons {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: min(0.7rem, 1vw);
		width: max-content;
		max-width: calc(100% - 2rem);
	}
	.crayon {
		/* Ten in a row: as big as the mode asks, unless the screen is narrower than that. */
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
	.chapter.blank {
		grid-column: 1 / -1;
		flex-direction: row;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
	}
	.chapter.blank :global(svg) {
		width: 3.5rem;
		height: 3.5rem;
	}

	/* Pictures keep the shape of the window they were painted in. */
	.framed {
		width: min(90vw, 48rem, calc((100dvh - 18rem) * var(--r, 1)));
		height: auto;
		border: var(--line) solid var(--ink);
		border-radius: 18px;
		box-shadow: 0 8px 0 var(--ink);
		display: block;
	}
	.framed.small {
		width: min(50vw, 20rem);
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
	/* Phones: start at the top instead of centring in the full height. */
	@media (max-width: 600px) {
		main {
			place-items: start center;
		}
	}
</style>
