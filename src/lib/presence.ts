/**
 * Presence and painting with a friend, the pure part (design/presence). Every message that crosses the wire is
 * checked here; only indices into things the app already knows can pass: an avatar, a screen, a picture id and
 * one crayon per closed region of its outline. No names, no text, no bitmaps. Plain Node-safe module.
 */
import { CRAYONS, PICTURES } from './paint';
import { AVATARS } from './players';
import { STICKERS } from './words';

/** The newest pictures a device keeps and hands to a newcomer. */
export const SHELF_MAX = 24;
/** Avatars on the strip, the child's own included. */
export const STRIP_MAX = 6;
/** Region labelling runs on this grid (pictures are drawn on 100×100); the paint canvas is twice as big. */
export const GRID = 400;
/** Smaller white islands are anti-aliasing crumbs, not regions. */
export const CRUMB = 100;
export const SCREENS = ['chapters', 'pictures', 'paint'] as const;
export type Screen = (typeof SCREENS)[number];

// Messages, one named kind each. `v` lets a later version refuse what it can't read.
export interface Hi { v: 1; avatar: number; screen: Screen }
export interface Pic { v: 1; id: string; picture: string; n: number; fills: number[] }
export interface Want { v: 1 }
export interface List { v: 1; pics: Pic[] }
/** Pairing: a device's friend key and face, swapped inside the one-time pair room. */
export interface Hello { v: 1; key: string; avatar: number }
/** Painting with a friend: an invite, an answer, the picture to open, progress, a crayon position, a finish. */
export interface Invite { v: 1 }
export interface Answer { v: 1; yes: boolean }
export interface Open { v: 1; picture: string }
export interface Fills { v: 1; picture: string; n: number; fills: number[] }
export interface At { v: 1; x: number; y: number }
export interface Done { v: 1; picture: string }

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
/** Exactly these keys, no more, no fewer. */
const shape = (x: unknown, keys: string[]): x is Record<string, unknown> =>
	isObj(x) && x.v === 1 && Object.keys(x).length === keys.length + 1 && keys.every((k) => k in x);
const int = (x: unknown, lo: number, hi: number): x is number => Number.isInteger(x) && (x as number) >= lo && (x as number) <= hi;
const unit = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1;
const PICTURE_IDS = new Set(PICTURES.map((p) => p.id));
const isPicture = (x: unknown): x is string => typeof x === 'string' && PICTURE_IDS.has(x);
const MAX_REGIONS = 64;
const isFills = (n: unknown, fills: unknown) =>
	int(n, 1, MAX_REGIONS) && Array.isArray(fills) && fills.length === n && fills.every((f) => int(f, -1, CRAYONS.length - 1));
export const isKey = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{32}$/.test(x);

export const valid = {
	hi: (x: unknown): x is Hi => shape(x, ['avatar', 'screen']) && int(x.avatar, 0, AVATARS.length - 1) && SCREENS.includes(x.screen as Screen),
	pic: (x: unknown): x is Pic =>
		shape(x, ['id', 'picture', 'n', 'fills']) && typeof x.id === 'string' && /^[0-9a-z]{8,16}$/.test(x.id) && isPicture(x.picture) && isFills(x.n, x.fills),
	want: (x: unknown): x is Want => shape(x, []),
	list: (x: unknown): x is List => shape(x, ['pics']) && Array.isArray(x.pics) && x.pics.length <= SHELF_MAX && x.pics.every((p) => valid.pic(p)),
	hello: (x: unknown): x is Hello => shape(x, ['key', 'avatar']) && isKey(x.key) && int(x.avatar, 0, AVATARS.length - 1),
	invite: (x: unknown): x is Invite => shape(x, []),
	answer: (x: unknown): x is Answer => shape(x, ['yes']) && typeof x.yes === 'boolean',
	open: (x: unknown): x is Open => shape(x, ['picture']) && isPicture(x.picture),
	fills: (x: unknown): x is Fills => shape(x, ['picture', 'n', 'fills']) && isPicture(x.picture) && isFills(x.n, x.fills),
	at: (x: unknown): x is At => shape(x, ['x', 'y']) && unit(x.x) && unit(x.y),
	done: (x: unknown): x is Done => shape(x, ['picture']) && isPicture(x.picture)
};
export type Kind = keyof typeof valid;

/** How often each peer may send each kind, in ms. Faster messages are dropped; a flood ignores the peer. */
export const RATE: Partial<Record<Kind, number>> = { hi: 2000, pic: 10000, want: 10000, list: 10000, invite: 60000, at: 100, fills: 400 };
/**
 * Kinds where only the newest message matters (a crayon position, a picture's colours). Sent at most every
 * 250 ms and 1 s, but relays bunch them up on the way, so one that comes early is just dropped: it never
 * counts towards ignoring the friend, which would also hide their painting for a minute.
 */
export const LATEST_ONLY: Partial<Record<Kind, true>> = { at: true, fills: true };
export const PENALTY_MS = 60000;
/** Dropped messages within a minute before a peer is ignored for one. */
export const FLOOD = 10;

/** Per-peer rate limiting, one per room: drops what comes too fast, and ignores a peer that keeps at it. */
export class Limiter {
	private last = new Map<string, number>();
	private drops = new Map<string, number[]>();
	private banned = new Map<string, number>();
	allow(peer: string, kind: Kind, now = Date.now()): boolean {
		if ((this.banned.get(peer) ?? 0) > now) return false;
		const gap = RATE[kind];
		if (!gap) return true;
		const k = `${peer}:${kind}`;
		const prev = this.last.get(k);
		if (prev !== undefined && now - prev < gap) {
			if (LATEST_ONLY[kind]) return false;
			const recent = [...(this.drops.get(peer) ?? []).filter((t) => now - t < PENALTY_MS), now];
			this.drops.set(peer, recent);
			if (recent.length >= FLOOD) this.banned.set(peer, now + PENALTY_MS);
			return false;
		}
		this.last.set(k, now);
		return true;
	}
	forget(peer: string) {
		for (const k of [...this.last.keys()]) if (k.startsWith(`${peer}:`)) this.last.delete(k);
		this.drops.delete(peer);
	}
}

/**
 * Labels the white (fillable) parts of a mask: 4-connected, numbered in the order a row-major scan first
 * meets them, so every device numbers a picture's regions the same way. Islands under `crumb` pixels are
 * dropped. `labels` holds each pixel's region index, or -1 (outline, crumb).
 */
export function labelRegions(mask: Uint8Array, w: number, h: number, crumb = CRUMB): { count: number; seeds: [number, number][]; labels: Int32Array } {
	const raw = new Int32Array(w * h).fill(-1);
	const sizes: number[] = [];
	const firsts: [number, number][] = [];
	const stack: number[] = [];
	let next = 0;
	for (let i = 0; i < w * h; i++) {
		if (!mask[i] || raw[i] !== -1) continue;
		const id = next++;
		const y0 = Math.floor(i / w);
		let x1 = i % w;
		while (x1 + 1 < w && mask[y0 * w + x1 + 1]) x1++;
		// The middle of the first run: inside the region, and the same pixel on every device.
		firsts.push([Math.floor((i % w + x1) / 2), y0]);
		let size = 0;
		raw[i] = id;
		stack.push(i);
		while (stack.length) {
			const p = stack.pop()!;
			size++;
			const x = p % w;
			const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w];
			for (const q of nb) {
				if (q < 0 || q >= w * h || !mask[q] || raw[q] !== -1) continue;
				raw[q] = id;
				stack.push(q);
			}
		}
		sizes.push(size);
	}
	// Renumber without the crumbs, keeping scan order.
	const remap = new Int32Array(next).fill(-1);
	const seeds: [number, number][] = [];
	for (let id = 0; id < next; id++) {
		if (sizes[id] < crumb) continue;
		remap[id] = seeds.length;
		seeds.push(firsts[id]);
	}
	const labels = new Int32Array(w * h);
	for (let i = 0; i < w * h; i++) labels[i] = raw[i] === -1 ? -1 : remap[raw[i]];
	return { count: seeds.length, seeds, labels };
}

/** The crayon index of an exact colour, or -1 (white paper, a blend at a stroke's edge, anything else). */
export function crayonAt(r: number, g: number, b: number): number {
	const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
	return CRAYONS.findIndex((c) => c.hex === hex);
}

// Keys and rooms. All derived with SHA-256 so relays only ever see opaque ids.
const enc = new TextEncoder();
export async function sha256(text: string): Promise<string> {
	const d = await globalThis.crypto.subtle.digest('SHA-256', enc.encode(text));
	return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** 128 random bits as hex: a device's friend key, a transfer key. */
export const newKey = (): string => [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
/** Today as YYYY-MM-DD in the device's own time zone. */
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** A short random id for a shared picture. */
export const newPicId = (): string => newKey().slice(0, 12);

/**
 * The public Paint Pot room, per language. One shard while few children are online: with more, two devices
 * would rarely meet. Raise it if a room ever gets crowded; every device is connected to every other in it.
 */
export const SHARDS = 1;
export const publicRoom = (language: string, shard: number) => `paint-${language}-${shard}`;
/** The public room's password is in this source: it keeps relays from reading the messages, nothing more. */
export const PUBLIC_PASSWORD = 'gamesforkids-paint-v1';

/** Sixteen sticker drawings a grown-up can match without reading (the two pictures of a progress move). */
export const CODE_PICTURES = ['🐱', '🐶', '🐟', '🦆', '🐮', '🐴', '🐻', '🦉', '🐷', '🦁', '🐘', '🦒', '🐰', '🦋', '🐢', '🐸'] as const;
if (!CODE_PICTURES.every((c) => c in STICKERS)) throw new Error('code pictures must be stickers');
/** The six-digit code one device shows and the other types (or opens as an invite link), board 7b. */
export const PAIR_DIGITS = 6;
export const newPairCode = (): string =>
	String(globalThis.crypto.getRandomValues(new Uint32Array(1))[0] % 10 ** PAIR_DIGITS).padStart(PAIR_DIGITS, '0');
export const isPairCode = (x: unknown): x is string => typeof x === 'string' && new RegExp(`^\\d{${PAIR_DIGITS}}$`).test(x);
/**
 * The pairing room and its password, from the code and the day; the code itself is never sent. A million
 * codes, open for ten minutes: guessing one in time through the relays is out of reach.
 */
export async function pairRoom(code: string, date = today()) {
	const base = `pair|${code}|${date}`;
	return { room: `pair-${(await sha256(base)).slice(0, 24)}`, password: await sha256(`pw|${base}`) };
}
/** The private room of two friends: the same on both devices whichever key is whose. */
export async function friendRoom(a: string, b: string) {
	const base = `friend|${[a, b].sort().join('|')}`;
	return { room: `friend-${(await sha256(base)).slice(0, 24)}`, password: await sha256(`pw|${base}`) };
}
