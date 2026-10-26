/**
 * Keys for moving progress to another device (design/progress-transfer). Everything the relays see is derived
 * from these with SHA-256, so they only ever get opaque ids. Plain Node-safe module.
 */
import { STICKERS } from './words';

export const isKey = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{32}$/.test(x);

const enc = new TextEncoder();
export async function sha256(text: string): Promise<string> {
	const d = await globalThis.crypto.subtle.digest('SHA-256', enc.encode(text));
	return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** 128 random bits as hex: a transfer key. */
export const newKey = (): string => [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Sixteen sticker drawings a grown-up can match without reading (the two pictures of a progress move). */
export const CODE_PICTURES = ['🐱', '🐶', '🐟', '🦆', '🐮', '🐴', '🐻', '🦉', '🐷', '🦁', '🐘', '🦒', '🐰', '🦋', '🐢', '🐸'] as const;
if (!CODE_PICTURES.every((c) => c in STICKERS)) throw new Error('code pictures must be stickers');
