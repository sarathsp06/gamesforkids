/**
 * Keeps the app's files on the device as they are used, so a second visit and every later tap need little or
 * no network, and a flaky connection doesn't stall a game.
 *
 * Nothing is downloaded ahead: on a slow or metered connection the first visit costs only what the child
 * actually opens. After that:
 * - Scripts, styles and fonts (their names change whenever their content does) come from the device.
 * - Voice clips and emoji pictures come from the device once heard or seen.
 * - Pages are asked from the network first, so a new version shows up; the stored copy answers when offline.
 * A new deploy starts a fresh store for scripts and pages; clips and pictures are kept.
 *
 * Nothing is sent anywhere: this only answers the app's own requests from its own store.
 */
import { self as sw } from '$app/service-worker';
import { version } from '$app/env';

const APP = `app-${version}`;
const ON_USE = 'on-use-v1';

const immutable = (path: string) => path.includes('/_app/immutable/');
const media = (path: string) => path.includes('/voice/') || path.includes('/emoji/');

sw.addEventListener('install', () => sw.skipWaiting());

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== APP && k !== ON_USE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

/** From the store when there; otherwise fetched, kept, and returned. */
async function stored(cacheName: string, req: Request): Promise<Response> {
	const cache = await caches.open(cacheName);
	const hit = await cache.match(req);
	if (hit) return hit;
	const res = await fetch(req);
	if (res.ok) cache.put(req, res.clone());
	return res;
}

/** From the network, keeping a copy; the copy answers when the network can't. */
async function fresh(req: Request): Promise<Response> {
	const cache = await caches.open(APP);
	try {
		const res = await fetch(req);
		if (res.ok) cache.put(req, res.clone());
		return res;
	} catch (e) {
		const hit = await cache.match(req);
		if (hit) return hit;
		throw e;
	}
}

sw.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	const url = new URL(req.url);
	if (url.origin !== sw.location.origin) return;
	if (immutable(url.pathname)) event.respondWith(stored(APP, req));
	else if (media(url.pathname)) event.respondWith(stored(ON_USE, req));
	else event.respondWith(fresh(req));
});
