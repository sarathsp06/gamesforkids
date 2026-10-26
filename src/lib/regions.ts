/**
 * Paint Pot pictures as regions, in the browser: the outline drawn on a small grid, its white areas labelled
 * (presence.ts), a painted canvas read back as one crayon per region, and a picture redrawn from those crayons.
 * This is all that ever travels of a child's painting: a brush scribble or a drawn word has no way through.
 */
import { CRAYONS, PICTURES, type Picture } from './paint';
import { GRID, crayonAt, labelRegions } from './presence';

/** The paint page's outline widths, in picture units: the edge the bucket stops at and the crisp line on top. */
export const EDGE = 1.2;
export const LINE = 1.8;

export interface Regions {
	picture: string;
	count: number;
	labels: Int32Array;
}
const cache = new Map<string, Regions>();

const grid = () => {
	const c = document.createElement('canvas');
	c.width = c.height = GRID;
	return c;
};
function stroke(ctx: CanvasRenderingContext2D, p: Picture, width: number) {
	ctx.save();
	ctx.setTransform(GRID / 100, 0, 0, GRID / 100, 0, 0);
	ctx.strokeStyle = '#000000';
	ctx.lineWidth = width;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.stroke(new Path2D(p.d));
	ctx.restore();
}

export function regionsOf(id: string): Regions | null {
	const hit = cache.get(id);
	if (hit) return hit;
	const p = PICTURES.find((x) => x.id === id);
	if (!p) return null;
	const ctx = grid().getContext('2d', { willReadFrequently: true })!;
	stroke(ctx, p, EDGE);
	const px = ctx.getImageData(0, 0, GRID, GRID).data;
	const mask = new Uint8Array(GRID * GRID);
	for (let i = 0; i < mask.length; i++) mask[i] = px[i * 4 + 3] < 128 ? 1 : 0;
	const { count, labels } = labelRegions(mask, GRID, GRID);
	const r = { picture: id, count, labels };
	cache.set(id, r);
	return r;
}

/**
 * One crayon per region of a painted canvas: the colour most of its pixels have, or -1 where none is a crayon.
 * `at` is where the picture sits on the canvas, in canvas pixels.
 */
export function fillsOf(painted: HTMLCanvasElement, r: Regions, at = { x: 0, y: 0, s: painted.width }): number[] {
	const ctx = grid().getContext('2d', { willReadFrequently: true })!;
	// Nearest-neighbour scaling keeps every pixel an exact crayon colour.
	ctx.imageSmoothingEnabled = false;
	// Only the picture's own square of the page: the paper around it can be any size.
	ctx.drawImage(painted, at.x, at.y, at.s, at.s, 0, 0, GRID, GRID);
	const px = ctx.getImageData(0, 0, GRID, GRID).data;
	const votes = Array.from({ length: r.count }, () => new Int32Array(CRAYONS.length));
	for (let i = 0; i < r.labels.length; i += 3) {
		const l = r.labels[i];
		if (l < 0) continue;
		const c = crayonAt(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
		if (c >= 0) votes[l][c]++;
	}
	return votes.map((v) => {
		let best = -1;
		for (let c = 0; c < v.length; c++) if (v[c] > 0 && (best < 0 || v[c] > v[best])) best = c;
		return best;
	});
}

/** Redraws a picture from its crayons onto `out` (any size), outline on top. False if the regions don't match. */
export function drawFills(out: HTMLCanvasElement, picture: string, n: number, fills: number[]): boolean {
	const r = regionsOf(picture);
	if (!r || r.count !== n) return false;
	const g = grid();
	const ctx = g.getContext('2d')!;
	const img = ctx.createImageData(GRID, GRID);
	const rgb = CRAYONS.map((c) => [1, 3, 5].map((i) => parseInt(c.hex.slice(i, i + 2), 16)));
	for (let i = 0; i < r.labels.length; i++) {
		const l = r.labels[i];
		const [R, G, B] = l >= 0 && fills[l] >= 0 ? rgb[fills[l]] : [255, 255, 255];
		img.data.set([R, G, B, 255], i * 4);
	}
	ctx.putImageData(img, 0, 0);
	stroke(ctx, PICTURES.find((p) => p.id === picture)!, LINE);
	const o = out.getContext('2d')!;
	o.clearRect(0, 0, out.width, out.height);
	o.drawImage(g, 0, 0, out.width, out.height);
	return true;
}

/** A redrawn picture as a small PNG, for the shelf. Cached by its id. */
const urls = new Map<string, string>();
export function pictureUrl(id: string, picture: string, n: number, fills: number[], size = 200): string | null {
	const hit = urls.get(id);
	if (hit) return hit;
	const c = document.createElement('canvas');
	c.width = c.height = size;
	if (!drawFills(c, picture, n, fills)) return null;
	const url = c.toDataURL('image/png');
	urls.set(id, url);
	return url;
}
