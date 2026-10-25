/**
 * The one door to the network (design/presence, design/progress-transfer). Trystero finds peers through
 * public Nostr relays and connects them directly over WebRTC; the room password encrypts what the relays see,
 * and WebRTC encrypts the rest end to end. Trystero loads only when a room is opened, so with the online
 * switch off nothing is fetched and no relay is contacted.
 */
import type { Room } from 'trystero';
import type { Limiter, Kind } from './presence';

export type { Room };
export const APP_ID = 'gamesforkids.sarathsp06';

export async function openRoom(id: string, password: string): Promise<Room> {
	const { joinRoom } = await import('trystero');
	return joinRoom({ appId: APP_ID, password }, id);
}

export interface Channel<T> {
	send: (data: T, to?: string) => void;
	on: (handler: (data: T, peer: string) => void) => void;
}

/**
 * A named message type in a room. Anything that fails `check`, or comes faster than the limiter allows, is
 * dropped without a trace a child could see.
 */
export function channel<T>(room: Room, name: Kind | string, check: (x: unknown) => x is T, limiter?: Limiter): Channel<T> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const action = room.makeAction<any>(name);
	let handler: ((data: T, peer: string) => void) | null = null;
	action.onMessage = (data: unknown, { peerId }) => {
		if (!check(data)) return;
		if (limiter && !limiter.allow(peerId, name as Kind)) return;
		handler?.(data, peerId);
	};
	return {
		send: (data, to) => void action.send(data, to ? { target: to } : undefined).catch(() => {}),
		on: (h) => (handler = h)
	};
}
