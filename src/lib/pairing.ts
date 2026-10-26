/**
 * Pairing two devices as friends (design/presence, board 7b): one shows a six-digit code, the other types it
 * or opens the invite link that carries it. Both open the room that code names, say their friend key and
 * face once, and are friends. Typing the code is the grown-ups' yes, so nothing else is asked. The room
 * closes after ten minutes.
 */
import { channel, openRoom } from './p2p';
import { pairRoom, valid, type Hello } from './presence';
import { loadFriends } from './presence.svelte';

export const PAIR_MS = 10 * 60_000;

export async function pair(code: string, avatar: number, onHello: (h: Hello) => void, onClosed: () => void): Promise<() => void> {
	const { room: id, password } = await pairRoom(code);
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
