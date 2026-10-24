/** Each game page calls trackPlay(id) on mount and the returned stop on unmount; minutes land in the grown-ups' week view. */
import { loadPlayLog, savePlayLog, type Play } from './storage';

export function trackPlay(game: string): () => void {
	const at = new Date();
	let stopped = false;
	const stop = () => {
		if (stopped) return;
		stopped = true;
		const ms = Date.now() - at.getTime();
		if (ms < 5000) return; // a glance isn't play
		savePlayLog([...loadPlayLog(), { game, at: at.toISOString(), ms }]);
	};
	// A closed tab never unmounts: save then too.
	window.addEventListener('pagehide', stop, { once: true });
	return stop;
}

/** Minutes per day for the last seven days, oldest first, and minutes per game over the same week. */
export function week(log: Play[] = loadPlayLog(), now = new Date()): { days: { label: Date; minutes: number }[]; games: Record<string, number> } {
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - 6);
	const days = Array.from({ length: 7 }, (_, i) => ({ label: new Date(start.getTime() + i * 86400000), minutes: 0 }));
	const games: Record<string, number> = {};
	for (const p of log) {
		const t = new Date(p.at);
		if (t < start) continue;
		const i = Math.min(6, Math.floor((t.getTime() - start.getTime()) / 86400000));
		days[i].minutes += p.ms / 60000;
		games[p.game] = (games[p.game] ?? 0) + p.ms / 60000;
	}
	return { days, games };
}
