/**
 * The one-time room behind "Send to another device" (design/progress-transfer). The key lives only in the QR
 * code's #fragment; the room id, its password and the two match pictures are all derived from it, so the
 * relays see neither the key nor the data: the bundle crosses them encrypted, in pieces.
 */
import { channel, openRoom, type Room } from './p2p';
import { CODE_PICTURES, isKey, sha256 } from './keys';
import { validate, type Bundle } from './transfer';

export const HANDOFF_MS = 5 * 60_000;
/** No other device after this long: offer the small link instead. */
export const SLOW_MS = 20_000;

export async function handoffRoom(key: string) {
	return { room: `take-${(await sha256(`take|${key}`)).slice(0, 24)}`, password: await sha256(`pw|take|${key}`) };
}
/** Two different sticker pictures both screens show, so a grown-up sends to the device in their hand. */
export async function matchPictures(key: string): Promise<[string, string]> {
	const h = await sha256(`match|${key}`);
	const a = parseInt(h.slice(0, 2), 16) % CODE_PICTURES.length;
	let b = parseInt(h.slice(2, 4), 16) % CODE_PICTURES.length;
	if (b === a) b = (b + 1) % CODE_PICTURES.length;
	return [CODE_PICTURES[a], CODE_PICTURES[b]];
}

export interface Handoff {
	send: (b: Bundle, peer: string) => void;
	leave: () => void;
}

/**
 * Opens the room. `onPeer` fires when the other device arrives or leaves (null); `onBundle` when a complete,
 * valid bundle comes in, `onBad` for anything else.
 */
export async function handoff(
	key: string,
	{ onPeer, onBundle, onBad }: { onPeer: (peer: string | null) => void; onBundle: (b: Bundle, peer: string) => void; onBad: () => void }
): Promise<Handoff> {
	if (!isKey(key)) throw new Error('not a handoff key');
	const { room: id, password } = await handoffRoom(key);
	const room: Room = await openRoom(id, password);
	const bundle = channel(room, 'bundle', (x: unknown): x is unknown => true);
	let peer: string | null = null;
	let open = true;
	room.onPeerJoin = (p) => {
		// One other device per handoff: a third is ignored.
		if (peer) return;
		peer = p;
		onPeer(p);
	};
	room.onPeerLeave = (p) => {
		if (p !== peer) return;
		peer = null;
		onPeer(null);
	};
	bundle.on((data, from) => {
		if (from !== peer) return;
		const b = validate(data);
		if (b) onBundle(b, from);
		else onBad();
	});
	const leave = () => {
		if (!open) return;
		open = false;
		clearTimeout(timer);
		void room.leave();
	};
	const timer = setTimeout(leave, HANDOFF_MS);
	return { send: (b, to) => bundle.send(b as unknown, to), leave };
}
