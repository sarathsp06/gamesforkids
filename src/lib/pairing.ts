/**
 * Pairing two devices as friends (design/presence, board 7b): one shows a QR code with a one-time key, the
 * other scans it. Both open the room that key names, say their friend key and face once, and are friends.
 * Scanning is the grown-ups' yes, so nothing else is asked. The room closes after ten minutes.
 */
import { channel, openRoom } from './p2p';
import { pairRoom, valid, type Hello } from './presence';
import { loadFriends } from './presence.svelte';

export const PAIR_MS = 10 * 60_000;

export async function pair(key: string, avatar: number, onHello: (h: Hello) => void, onClosed: () => void): Promise<() => void> {
	const { room: id, password } = await pairRoom(key);
	const room = await openRoom(id, password);
	const hello = channel(room, 'hello', valid.hello);
	const mine: Hello = { v: 1, key: loadFriends().key, avatar };
	room.onPeerJoin = (peer) => hello.send(mine, peer);
	hello.on((h) => h.key !== mine.key && onHello(h));
	let open = true;
	const close = () => {
		if (!open) return;
		open = false;
		clearTimeout(timer);
		void room.leave();
		onClosed();
	};
	const timer = setTimeout(close, PAIR_MS);
	return close;
}
