/**
 * Paint Pot together, the live part (design/presence): the public room of other children painting, the shelf
 * of pictures they finished, and each remembered friend's private room, where an invite turns into painting
 * side by side. Everything is in memory and ends with the page; only the friend list is kept on the device.
 */
import { openRoom, channel, type Channel, type Room } from './p2p';
import {
	Limiter, PUBLIC_PASSWORD, SHARDS, SHELF_MAX, STRIP_MAX, friendRoom, isKey, newKey, newPicId, publicRoom, valid,
	type At, type Fills, type Hi, type Pic, type Screen
} from './presence';
import { AVATARS } from './players';

// Friends: kept on this device. A friendship is between two devices, so siblings on one tablet share it.
const FRIENDS = 'friends';
export interface Friend {
	key: string;
	avatar: number;
	added: string;
}
export interface Friends {
	v: 1;
	/** This device's own friend key, made on first use. */
	key: string;
	list: Friend[];
}
export function loadFriends(): Friends {
	try {
		const f = JSON.parse(localStorage.getItem(FRIENDS) ?? 'null');
		if (f?.v === 1 && isKey(f.key) && Array.isArray(f.list)) {
			const list = f.list.filter((x: Friend) => isKey(x?.key) && Number.isInteger(x.avatar) && x.avatar >= 0 && x.avatar < AVATARS.length);
			return { v: 1, key: f.key, list };
		}
	} catch {
		/* a broken list starts afresh */
	}
	const fresh: Friends = { v: 1, key: newKey(), list: [] };
	saveFriends(fresh);
	return fresh;
}
export function saveFriends(f: Friends) {
	try {
		localStorage.setItem(FRIENDS, JSON.stringify(f));
	} catch (e) {
		console.error('Failed to save friends', e);
	}
}
export function addFriend(key: string, avatar: number) {
	const f = loadFriends();
	if (key === f.key) return;
	f.list = [...f.list.filter((x) => x.key !== key), { key, avatar, added: new Date().toISOString() }];
	saveFriends(f);
}
export function forgetFriend(key: string) {
	const f = loadFriends();
	f.list = f.list.filter((x) => x.key !== key);
	saveFriends(f);
}

/** What the page hears about, to let Pip say it. */
export type Event = 'shelf' | 'friendHere' | 'invited' | 'accepted' | 'declined' | 'open' | 'friendDone' | 'friendAway';

interface FriendLink {
	friend: Friend;
	room: Room;
	peer: string | null;
	hi: Channel<Hi>;
	invite: Channel<{ v: 1 }>;
	answer: Channel<{ v: 1; yes: boolean }>;
	open: Channel<{ v: 1; picture: string }>;
	fills: Channel<Fills>;
	at: Channel<At>;
	done: Channel<{ v: 1; picture: string }>;
}

export class Together {
	/** Other children in the public room, by peer: their face and where they are. */
	peers = $state<Record<string, { avatar: number; screen: Screen }>>({});
	/** Pictures other children finished, newest first. */
	shelf = $state<Pic[]>([]);
	/** Remembered friends who are in Paint Pot right now, by friend key. */
	online = $state<Record<string, number>>({});
	/** Painting with a friend: who, and how far the asking has got. */
	with = $state<{ key: string; state: 'asking' | 'invited' | 'on' | 'away' } | null>(null);
	/** The friend's picture as region crayons, their crayon's position, and whether they finished. */
	friendFills = $state<Fills | null>(null);
	friendAt = $state<At | null>(null);
	friendDone = $state(false);

	private avatar = 0;
	private screen: Screen = 'chapters';
	private publicRoom: Room | null = null;
	private hi: Channel<Hi> | null = null;
	private pic: Channel<Pic> | null = null;
	private links = new Map<string, FriendLink>();
	/** One per room: Trystero's peer id is the same in every room, and each room has its own pace. */
	private limiter = new Limiter();
	private hiTimer: ReturnType<typeof setTimeout> | undefined;
	private lastHi = 0;
	private stopped = false;
	private listeners: ((e: Event, data?: string) => void)[] = [];

	on(f: (e: Event, data?: string) => void) {
		this.listeners.push(f);
	}
	private emit(e: Event, data?: string) {
		for (const f of this.listeners) f(e, data);
	}

	/** Joins the public room (when the grown-ups switch is on) and every remembered friend's room. */
	async start({ language, avatar, publicToo }: { language: string; avatar: number; publicToo: boolean }) {
		this.avatar = avatar;
		const leave = () => this.stop();
		window.addEventListener('pagehide', leave, { once: true });
		if (publicToo) await this.joinPublic(language);
		for (const f of loadFriends().list) await this.joinFriend(f);
	}

	stop() {
		this.stopped = true;
		clearTimeout(this.hiTimer);
		void this.publicRoom?.leave();
		for (const l of this.links.values()) void l.room.leave();
		this.links.clear();
		this.publicRoom = null;
	}

	private async joinPublic(language: string) {
		const shard = Math.floor(Math.random() * SHARDS);
		const room = await openRoom(publicRoom(language, shard), PUBLIC_PASSWORD);
		if (this.stopped) return void room.leave();
		this.publicRoom = room;
		const lim = this.limiter;
		this.hi = channel(room, 'hi', valid.hi, lim);
		this.pic = channel(room, 'pic', valid.pic, lim);
		const want = channel(room, 'want', valid.want, lim);
		const list = channel(room, 'list', valid.list, lim);
		room.onPeerJoin = (peer) => {
			this.hi!.send(this.me(), peer);
			want.send({ v: 1 }, peer);
		};
		room.onPeerLeave = (peer) => {
			const { [peer]: _, ...rest } = this.peers;
			this.peers = rest;
			this.limiter.forget(peer);
		};
		this.hi.on((h, peer) => {
			if (!(peer in this.peers) && Object.keys(this.peers).length >= STRIP_MAX - 1) return;
			this.peers = { ...this.peers, [peer]: { avatar: h.avatar, screen: h.screen } };
		});
		this.pic.on((p) => this.shelve([p]));
		want.on((_, peer) => list.send({ v: 1, pics: this.shelf.slice(0, SHELF_MAX) }, peer));
		list.on((l) => this.shelve(l.pics));
	}

	private shelve(pics: Pic[]) {
		const had = this.shelf.length;
		const ids = new Set(this.shelf.map((p) => p.id));
		const fresh = pics.filter((p) => !ids.has(p.id));
		if (!fresh.length) return;
		this.shelf = [...fresh, ...this.shelf].slice(0, SHELF_MAX);
		if (!had) this.emit('shelf');
	}

	private me(): Hi {
		return { v: 1, avatar: this.avatar, screen: this.screen };
	}

	/** Where the child is: told to others at most every few seconds, never while nothing changed. */
	setScreen(screen: Screen) {
		if (screen === this.screen) return;
		this.screen = screen;
		clearTimeout(this.hiTimer);
		const send = () => {
			this.lastHi = Date.now();
			this.hi?.send(this.me());
		};
		const wait = this.lastHi + 2500 - Date.now();
		if (wait <= 0) send();
		else this.hiTimer = setTimeout(send, wait);
	}

	/** A finished picture, as its region crayons: onto this device's shelf and everyone else's. */
	share(picture: string, n: number, fills: number[]) {
		if (!this.publicRoom) return;
		const p: Pic = { v: 1, id: newPicId(), picture, n, fills };
		this.shelf = [p, ...this.shelf].slice(0, SHELF_MAX);
		this.pic?.send(p);
	}

	/** A friend paired while Paint Pot is open: join their room now, not on the next visit. */
	async meet(friend: Friend) {
		if (!this.stopped && !this.links.has(friend.key)) await this.joinFriend(friend);
	}

	// A remembered friend's private room: only the two devices know its key.
	private async joinFriend(friend: Friend) {
		const me = loadFriends().key;
		const { room: id, password } = await friendRoom(me, friend.key);
		const room = await openRoom(id, password);
		if (this.stopped) return void room.leave();
		const lim = new Limiter();
		const link: FriendLink = {
			friend,
			room,
			peer: null,
			hi: channel(room, 'hi', valid.hi, lim),
			invite: channel(room, 'invite', valid.invite, lim),
			answer: channel(room, 'answer', valid.answer, lim),
			open: channel(room, 'open', valid.open, lim),
			fills: channel(room, 'fills', valid.fills, lim),
			at: channel(room, 'at', valid.at, lim),
			done: channel(room, 'done', valid.done, lim)
		};
		this.links.set(friend.key, link);
		const k = friend.key;
		room.onPeerJoin = (peer) => link.hi.send(this.me(), peer);
		room.onPeerLeave = (peer) => {
			if (link.peer !== peer) return;
			link.peer = null;
			const { [k]: _, ...rest } = this.online;
			this.online = rest;
			if (this.with?.key === k) {
				this.with = { key: k, state: 'away' };
				this.emit('friendAway');
			}
		};
		link.hi.on((h, peer) => {
			// Two of this friend's tabs: the newest one counts.
			const first = !(k in this.online);
			link.peer = peer;
			this.online = { ...this.online, [k]: h.avatar };
			if (this.with?.key === k && this.with.state === 'away') {
				this.with = { key: k, state: 'on' };
				this.friendDone = false;
			} else if (first) this.emit('friendHere');
		});
		const fromFriend = (peer: string) => peer === link.peer;
		link.invite.on((_, peer) => {
			if (!fromFriend(peer) || this.with) return;
			this.with = { key: k, state: 'invited' };
			this.emit('invited');
		});
		link.answer.on((a, peer) => {
			if (!fromFriend(peer) || this.with?.key !== k || this.with.state !== 'asking') return;
			this.with = a.yes ? { key: k, state: 'on' } : null;
			this.emit(a.yes ? 'accepted' : 'declined');
		});
		link.open.on((o, peer) => {
			if (!fromFriend(peer) || this.with?.key !== k || this.with.state !== 'on') return;
			this.friendFills = null;
			this.friendDone = false;
			this.emit('open', o.picture);
		});
		link.fills.on((f, peer) => fromFriend(peer) && this.with?.key === k && (this.friendFills = f));
		link.at.on((a, peer) => fromFriend(peer) && this.with?.key === k && (this.friendAt = a));
		link.done.on((_, peer) => {
			if (!fromFriend(peer) || this.with?.key !== k) return;
			this.friendDone = true;
			this.emit('friendDone');
		});
	}

	private link() {
		const l = this.with && this.links.get(this.with.key);
		return l && l.peer ? l : null;
	}

	/** The child taps a friend's heart avatar and says yes to Pip. */
	invite(key: string) {
		const l = this.links.get(key);
		if (!l?.peer || this.with) return;
		this.with = { key, state: 'asking' };
		l.invite.send({ v: 1 }, l.peer);
	}
	answer(yes: boolean) {
		const l = this.link();
		if (!l || this.with?.state !== 'invited') return;
		l.answer.send({ v: 1, yes }, l.peer!);
		this.with = yes ? { key: this.with.key, state: 'on' } : null;
	}
	/** Ends painting together on this side (the child went home); the friend just carries on alone. */
	part() {
		this.with = null;
		this.friendFills = null;
		this.friendAt = null;
		this.friendDone = false;
	}
	get painting() {
		return this.with?.state === 'on';
	}
	openPicture(picture: string) {
		const l = this.link();
		if (!l || !this.painting) return;
		this.friendFills = null;
		this.friendDone = false;
		l.open.send({ v: 1, picture }, l.peer!);
	}
	sendFills(f: Fills) {
		const l = this.link();
		if (l && this.painting) l.fills.send(f, l.peer!);
	}
	sendAt(a: At) {
		const l = this.link();
		if (l && this.painting) l.at.send(a, l.peer!);
	}
	sendDone(picture: string) {
		const l = this.link();
		if (l && this.painting) l.done.send({ v: 1, picture }, l.peer!);
	}
}
