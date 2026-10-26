/**
 * The one door to the network (design/progress-transfer). Devices never connect to each
 * other: every message goes through a handful of public Nostr relays, encrypted with a key only the devices
 * in that room know (AES-GCM, from the room name and password). Relays see an opaque topic, scrambled bytes
 * and the device's internet address; other devices see none of that. This works on any network a web page
 * works on, where a direct connection is often blocked (mobile data, guest Wi-Fi, schools).
 *
 * Nothing loads or connects until a room is opened: only moving progress to another device opens one.
 */

export const APP_ID = 'gamesforkids.sarathsp06';
/** Relays checked to pass these messages without an account (October 2026). Each message goes to all of them. */
export const RELAYS = ['wss://nos.lol', 'wss://relay.primal.net', 'wss://nostr.mom', 'wss://offchain.pub', 'wss://relay.nostr.net', 'wss://nostr.oxtr.dev'];
/** An ephemeral event kind: relays pass it on and never store it. */
const KIND = 20784;
/** Content above this is split; the smallest relay limit seen is ~64 kB a message. */
const CHUNK = 30_000;
const CHUNK_GAP_MS = 150;
const BEAT_MS = 20_000;
const GONE_MS = 65_000;

const enc = new TextEncoder();
const dec = new TextDecoder();
const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const digest = async (s: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const b64 = (b: Uint8Array) => btoa(Array.from(b, (c) => String.fromCharCode(c)).join(''));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const randomId = () => hex(crypto.getRandomValues(new Uint8Array(8)));

/** This page's id in every room; a new one each time the page loads. */
const selfId = randomId();

interface NostrEvent { id: string; pubkey: string; created_at: number; kind: number; tags: string[][]; content: string; sig: string }

// One signing key per page load: it says nothing about the device, it only lets relays accept the events.
let signer: Promise<{ pubkey: string; sign: (id: string) => Promise<string> }> | null = null;
function getSigner() {
	signer ??= import('@noble/secp256k1').then(({ schnorr, utils }) => {
		const sk = utils.randomSecretKey();
		return { pubkey: hex(schnorr.getPublicKey(sk)), sign: async (id: string) => hex(await schnorr.signAsync(unhex(id), sk)) };
	});
	return signer;
}
const unhex = (s: string) => Uint8Array.from(s.match(/../g)!, (h) => parseInt(h, 16));

async function makeEvent(topic: string, content: string): Promise<NostrEvent> {
	const { pubkey, sign } = await getSigner();
	const e = { pubkey, created_at: Math.floor(Date.now() / 1000), kind: KIND, tags: [['x', topic]], content };
	const id = hex(await digest(JSON.stringify([0, e.pubkey, e.created_at, e.kind, e.tags, e.content])));
	return { ...e, id, sig: await sign(id) };
}

/** A relay connection that reconnects by itself and replays its subscriptions. */
class Relay {
	private ws: WebSocket | null = null;
	private subs = new Map<string, string>();
	/** Events published while connecting: sent on open, unless they are stale by then. */
	private queue: NostrEvent[] = [];
	private wait = 1000;
	private closed = false;
	constructor(
		private url: string,
		private onEvent: (sub: string, e: NostrEvent) => void
	) {
		this.connect();
	}
	private connect() {
		if (this.closed) return;
		const ws = new WebSocket(this.url);
		this.ws = ws;
		ws.onopen = () => {
			this.wait = 1000;
			for (const [id, topic] of this.subs) this.req(id, topic);
			const fresh = Math.floor(Date.now() / 1000) - 20;
			for (const e of this.queue.splice(0)) if (e.created_at >= fresh) this.raw(['EVENT', e]);
		};
		ws.onmessage = (m) => {
			try {
				const d = JSON.parse(m.data as string);
				if (d[0] === 'EVENT' && d[2]?.kind === KIND) this.onEvent(d[1], d[2]);
			} catch {
				/* not ours */
			}
		};
		ws.onclose = () => {
			if (this.ws !== ws || this.closed) return;
			setTimeout(() => this.connect(), this.wait);
			this.wait = Math.min(this.wait * 2, 60_000);
		};
	}
	private raw(msg: unknown[]) {
		if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
	}
	private req(id: string, topic: string) {
		this.raw(['REQ', id, { kinds: [KIND], '#x': [topic], since: Math.floor(Date.now() / 1000) - 30 }]);
	}
	subscribe(id: string, topic: string) {
		this.subs.set(id, topic);
		this.req(id, topic);
	}
	unsubscribe(id: string) {
		this.subs.delete(id);
		this.raw(['CLOSE', id]);
	}
	publish(e: NostrEvent) {
		if (this.ws?.readyState === WebSocket.OPEN) this.raw(['EVENT', e]);
		else if (this.queue.push(e) > 200) this.queue.shift();
	}
	get idle() {
		return this.subs.size === 0;
	}
	close() {
		this.closed = true;
		this.ws?.close();
	}
}

// The relays are shared by every open room and closed when the last room leaves.
const rooms = new Map<string, RelayRoom>();
let relays: Relay[] = [];
const seen = new Set<string>();
function route(sub: string, e: NostrEvent) {
	if (seen.has(e.id)) return;
	seen.add(e.id);
	if (seen.size > 5000) seen.clear();
	void rooms.get(sub)?.receive(e.content);
}
const openRelays = () => {
	if (!relays.length) relays = RELAYS.map((u) => new Relay(u, route));
	return relays;
};

interface Wire { f: string; t?: string; k: string; d?: unknown }

export interface Room {
	onPeerJoin: ((peer: string) => void) | null;
	onPeerLeave: ((peer: string) => void) | null;
	leave: () => Promise<void>;
}

class RelayRoom implements Room {
	onPeerJoin: ((peer: string) => void) | null = null;
	onPeerLeave: ((peer: string) => void) | null = null;
	handlers = new Map<string, (data: unknown, peer: string) => void>();
	private peers = new Map<string, number>();
	private parts = new Map<string, { got: string[]; n: number; at: number }>();
	private timer: ReturnType<typeof setInterval>;
	private sub = randomId();
	private open = true;
	constructor(
		private topic: string,
		private key: CryptoKey
	) {
		rooms.set(this.sub, this);
		for (const r of openRelays()) r.subscribe(this.sub, topic);
		// Say hello once the caller has set its handlers, then now and then so others know this page is still here.
		setTimeout(() => this.send('_hi'), 0);
		this.timer = setInterval(() => {
			this.send('_hi');
			const now = Date.now();
			for (const [p, last] of this.peers) if (now - last > GONE_MS) this.drop(p);
			for (const [id, m] of this.parts) if (now - m.at > 120_000) this.parts.delete(id);
		}, BEAT_MS);
	}

	async send(kind: string, data?: unknown, to?: string) {
		if (!this.open) return;
		const iv = crypto.getRandomValues(new Uint8Array(12));
		const wire: Wire = { f: selfId, k: kind, ...(to ? { t: to } : {}), ...(data === undefined ? {} : { d: data }) };
		const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.key, enc.encode(JSON.stringify(wire))));
		const body = b64(iv) + b64(ct);
		if (body.length <= CHUNK) return this.publish(body);
		// Too big for one message (a progress bundle with pictures): numbered pieces, a little apart.
		const id = randomId();
		const n = Math.ceil(body.length / CHUNK);
		for (let i = 0; i < n; i++) {
			if (!this.open) return;
			await this.publish(`${id}.${i}.${n}.${body.slice(i * CHUNK, (i + 1) * CHUNK)}`);
			await new Promise((r) => setTimeout(r, CHUNK_GAP_MS));
		}
	}
	private async publish(content: string) {
		const e = await makeEvent(this.topic, content);
		for (const r of relays) r.publish(e);
	}

	async receive(content: string) {
		let body = content;
		const dot = content.indexOf('.');
		if (dot > 0) {
			const [id, i, n] = content.split('.', 3);
			const total = Number(n);
			if (!/^[0-9a-f]{16}$/.test(id) || !(total > 1 && total <= 400) || !(Number(i) >= 0 && Number(i) < total)) return;
			const m = this.parts.get(id) ?? { got: Array<string>(total), n: 0, at: Date.now() };
			this.parts.set(id, m);
			if (m.got[Number(i)] === undefined) m.n++;
			m.got[Number(i)] = content.slice(id.length + i.length + n.length + 3);
			if (m.n < total) return;
			this.parts.delete(id);
			body = m.got.join('');
		}
		let wire: Wire;
		try {
			const iv = unb64(body.slice(0, 16));
			const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, this.key, unb64(body.slice(16)));
			wire = JSON.parse(dec.decode(pt));
		} catch {
			return; // not for this room, or tampered with
		}
		const peer = wire.f;
		if (!this.open || typeof peer !== 'string' || peer === selfId || (wire.t && wire.t !== selfId)) return;
		if (wire.k === '_bye') return this.drop(peer);
		const known = this.peers.has(peer);
		this.peers.set(peer, Date.now());
		if (!known) {
			// Answer a newcomer directly, so it learns about this page without waiting for the next hello.
			void this.send('_hi', undefined, peer);
			this.onPeerJoin?.(peer);
		}
		if (wire.k !== '_hi') this.handlers.get(wire.k)?.(wire.d, peer);
	}

	private drop(peer: string) {
		if (!this.peers.delete(peer)) return;
		this.onPeerLeave?.(peer);
	}

	async leave() {
		if (!this.open) return;
		await this.send('_bye');
		this.open = false;
		clearInterval(this.timer);
		rooms.delete(this.sub);
		for (const r of relays) r.unsubscribe(this.sub);
		if (!rooms.size) {
			for (const r of relays) r.close();
			relays = [];
		}
	}
}

export async function openRoom(id: string, password: string): Promise<Room> {
	const topic = hex(await digest(`topic|${APP_ID}|${id}`));
	const key = await crypto.subtle.importKey('raw', await digest(`key|${APP_ID}|${id}|${password}`), 'AES-GCM', false, ['encrypt', 'decrypt']);
	return new RelayRoom(topic, key);
}

export interface Channel<T> {
	send: (data: T, to?: string) => void;
	on: (handler: (data: T, peer: string) => void) => void;
}

/** A named message type in a room. Anything that fails `check` is dropped without a trace a child could see. */
export function channel<T>(room: Room, name: string, check: (x: unknown) => x is T): Channel<T> {
	const r = room as RelayRoom;
	let handler: ((data: T, peer: string) => void) | null = null;
	r.handlers.set(name, (data, peer) => {
		if (!check(data)) return;
		handler?.(data, peer);
	});
	return {
		send: (data, to) => void r.send(name, data, to),
		on: (h) => (handler = h)
	};
}
