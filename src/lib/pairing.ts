/**
 * Pairing two devices as friends (design/presence): both grown-ups use the same four pictures, which name a
 * room only those two devices can find. Inside it each device says its friend key and face, once. The code
 * itself never travels; the room closes after ten minutes.
 */
import { channel, openRoom } from './p2p';
import { pairRoom, valid, type Hello } from './presence';
import { loadFriends } from './presence.svelte';

export const PAIR_MS = 10 * 60_000;

export async function pair(code: number[], avatar: number, onHello: (h: Hello) => void, onClosed: () => void): Promise<() => void> {
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
