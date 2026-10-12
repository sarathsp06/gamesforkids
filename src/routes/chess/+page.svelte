<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { resolve } from '$app/paths';
	import { speak, stopSpeech, sfx, unlockSpeech } from '#lib/audio.ts';
	import {
		CHESS_LEVELS, HEX_LEVEL, hexComputer, hexMoves, hexWinner, legal, puzzle, solve,
		type Hex, type HexMove, type Piece, type Puzzle
	} from '#lib/chess.ts';
	import { gradeAttempts, type Grade } from '#lib/score.ts';
	import { LANGUAGES, type Language } from '#lib/words.ts';
	import { t, type Line } from '#lib/i18n.ts';
	import { loadChessLevel, loadLanguage, saveChessLevel, saveLanguage } from '#lib/storage.ts';

	const BREATHE_MS = 900; // small pause before the prompt, on start and between puzzles
	const COMPUTER_MS = 800; // the computer "thinks" this long, so the child sees each move
	/** One wasted move is almost; from two on, the next best square glows. */
	const ALMOST = 0.75;
	// Text presentation: without U+FE0E some phones draw ♟ as a colour emoji.
	const GLYPH: Record<Piece | 'pawn', string> = { rook: '♜︎', bishop: '♝︎', knight: '♞︎', pawn: '♟︎' };

	let phase = $state<'start' | 'play' | 'reward'>('start');
	let language = $state<Language>('en');
	let level = $state(1);
	let grades = $state<Grade[]>([]);
	let done = $state(0);
	let wrongSims: number[] = [];
	let solved = $state(false);
	let timer = 0;
	let speakTimer = 0;
	const hexMode = $derived(level >= HEX_LEVEL);
	const round = $derived(hexMode ? 3 : 5);

	// Path puzzles (levels 1–6)
	let pz = $state<Puzzle>();
	let at = $state(0);
	let left = $state<number[]>([]);
	let made = $state(0);
	let showDots = $state(false);
	let showDanger = $state(false);
	let hint = $state<number | null>(null);
	/** Square that just refused a move: shakes once. */
	let bump = $state<{ sq: number; n: number }>({ sq: -1, n: 0 });

	// Hexapawn (levels 7–8). Pawns keep an id so they slide instead of jumping.
	let pawns = $state<{ id: number; side: 1 | 2; at: number }[]>([]);
	let selected = $state<number | null>(null);
	let childTurn = $state(false);
	const board = $derived.by(() => {
		const b: Hex = Array(9).fill(0);
		for (const p of pawns) b[p.at] = p.side;
		return b;
	});

	onMount(() => {
		language = loadLanguage();
		level = loadChessLevel();
		return stop;
	});

	function stop() {
		clearTimeout(timer);
		clearTimeout(speakTimer);
		stopSpeech();
	}
	const later = (fn: () => void, ms: number) => {
		clearTimeout(timer);
		timer = window.setTimeout(fn, ms);
	};

	const n = $derived(hexMode ? 3 : (pz?.n ?? 4));
	const prompt = (): Line[] => {
		if (hexMode) return [t(language, 'chess.hex'), t(language, 'chess.rule.pawn')];
		const p = pz!;
		const goal = t(language, p.stars.length > 1 ? 'chess.stars' : 'chess.star');
		return [t(language, `chess.rule.${p.piece}`), goal, ...(p.guard ? [t(language, 'chess.guard')] : [])];
	};
	const sayPrompt = () => {
		clearTimeout(speakTimer);
		speakTimer = window.setTimeout(() => speak(prompt(), language), BREATHE_MS);
	};

	function play() {
		done = 0;
		grades = [];
		phase = 'play';
		unlockSpeech(); // the prompt is spoken after a pause, outside the gesture
		next();
	}

	function next() {
		wrongSims = [];
		solved = false;
		if (hexMode) return newHexGame(true);
		pz = puzzle(level);
		at = pz.start;
		left = pz.stars;
		made = 0;
		showDots = pz.dots;
		showDanger = false;
		hint = null;
		sayPrompt();
	}

	/** Shared by both modes: grade, praise, then the next puzzle once the speech is done. */
	function win(extra: Line[] = []) {
		solved = true;
		done++;
		grades = [...grades, gradeAttempts(wrongSims)];
		sfx.chime();
		const current = done;
		const go = () => {
			if (phase !== 'play' || done !== current || !solved) return;
			later(() => (done >= round ? finish() : next()), 700);
		};
		speak([t(language, 'praise'), ...extra], language, go);
		later(go, 12000); // TTS sometimes never reports the end
	}

	function refuse(sq: number) {
		bump = { sq, n: bump.n + 1 };
		sfx.bloop();
	}

	function tapPath(sq: number) {
		const p = pz!;
		if (solved || sq === at) return;
		if (!legal(p, at, left).includes(sq)) {
			refuse(sq);
			showDots = true;
			speak(t(language, `chess.rule.${p.piece}`), language);
			return;
		}
		if (p.danger.includes(sq)) {
			refuse(sq);
			showDanger = true;
			wrongSims.push(0);
			speak(t(language, 'chess.caught'), language);
			return;
		}
		clearTimeout(speakTimer);
		at = sq;
		made++;
		if (left.includes(sq)) {
			left = left.filter((s) => s !== sq);
			sfx.tok();
		}
		if (left.length === 0) {
			const extra = made - p.par;
			if (extra === 1) wrongSims.push(ALMOST);
			else if (extra > 1) wrongSims.push(0);
			hint = null;
			return win([extra === 0 ? t(language, 'chess.fewest') : t(language, 'chess.canDoIn', p.par)]);
		}
		// Staged help: after two wasted moves, light up the next square of a shortest way.
		const rest = solve(p, at, left);
		hint = made + rest.dist - p.par >= 2 ? rest.next : null;
	}

	function newHexGame(first: boolean) {
		pawns = [2, 2, 2, 0, 0, 0, 1, 1, 1].flatMap((side, i) => (side ? [{ id: i, side: side as 1 | 2, at: i }] : []));
		selected = null;
		childTurn = false;
		if (first) sayPrompt();
		// The computer moves first: with best play the second player wins, so the child always can.
		later(computerMove, first ? BREATHE_MS + 4500 : 1500);
	}

	function apply([from, to]: HexMove) {
		pawns = pawns.filter((p) => p.at !== to).map((p) => (p.at === from ? { ...p, at: to } : p));
	}

	function computerMove() {
		if (phase !== 'play' || !hexMode) return;
		const m = hexComputer(board, level > HEX_LEVEL);
		apply(m);
		sfx.tok();
		if (hexWinner(board, 2)) {
			wrongSims.push(0);
			later(() => {
				sfx.bloop();
				speak(t(language, 'chess.lost'), language, () => later(() => newHexGame(false), 300));
				later(() => newHexGame(false), 6000);
			}, 600);
			return;
		}
		childTurn = true;
	}

	function tapHex(sq: number) {
		if (!childTurn || solved) return;
		if (board[sq] === 1) {
			selected = sq;
			return;
		}
		const options = hexMoves(board, 1).filter(([f, t]) => t === sq && (selected === null || f === selected));
		// No pawn picked yet: a tap on a square only one pawn can reach moves that pawn.
		const m = options.length === 1 ? options[0] : null;
		if (!m) {
			refuse(sq);
			speak(t(language, 'chess.rule.pawn'), language);
			return;
		}
		clearTimeout(speakTimer);
		apply(m);
		selected = null;
		childTurn = false;
		if (hexWinner(board, 1)) return win();
		sfx.tok();
		later(computerMove, COMPUTER_MS);
	}

	const targets = $derived(
		phase !== 'play'
			? []
			: hexMode
				? childTurn && selected !== null
					? hexMoves(board, 1).filter(([f]) => f === selected).map(([, t]) => t)
					: []
				: showDots && pz && !solved
					? legal(pz, at, left)
					: []
	);

	/** Four first-try wins out of five (two of three in Hexapawn): the next round is one level harder. */
	function finish() {
		phase = 'reward';
		if (grades.filter((g) => g === 'gold').length >= round - 1 && level < CHESS_LEVELS) {
			level++;
			saveChessLevel(level);
		}
	}

	const pos = (sq: number) => `left: ${((sq % n) * 100) / n}%; top: ${(Math.floor(sq / n) * 100) / n}%;`;
</script>

<main>
	<div class="corner left">
		{#if phase === 'start'}
			<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>
		{:else}
			<button type="button" class="icon" aria-label="Home" onclick={() => { stop(); phase = 'start'; }}>⌂</button>
		{/if}
	</div>

	{#if phase === 'start'}
		<section class="stage">
			<button type="button" class="big-btn play" aria-label="Play" onclick={play}>▶</button>
			<div class="flags" role="group" aria-label="Language">
				{#each LANGUAGES as l (l.id)}
					<button
						type="button"
						class="flag"
						aria-label={l.name}
						aria-pressed={language === l.id}
						onclick={() => {
							language = l.id;
							saveLanguage(l.id);
							speak(t(l.id, 'lang.name'), l.id);
						}}>{l.flag}</button
					>
				{/each}
			</div>
			<div class="levels" role="group" aria-label="Level">
				{#each Array.from({ length: CHESS_LEVELS }, (_, i) => i + 1) as l (l)}
					<button
						type="button"
						class="lvl"
						aria-label="Level {l}"
						aria-pressed={level === l}
						onclick={() => {
							level = l;
							saveChessLevel(l);
						}}>{l}</button
					>
				{/each}
			</div>
		</section>
	{:else if phase === 'play'}
		<ol class="dots" aria-label="{done} of {round}">
			{#each Array.from({ length: round }, (_, i) => i) as i (i)}
				<li class={grades[i]}>{grades[i] ? '★' : ''}</li>
			{/each}
		</ol>
		<section class="stage">
			<button type="button" class="big-btn ear" aria-label="Hear it again" onclick={() => speak(prompt(), language)}>🔊</button>
			{#if hexMode || pz}
				{@const key = hexMode ? 'hex' : pz}
				{#key key}
					<div class="board" style="--n: {n}" role="grid" aria-label="Board">
						{#each Array.from({ length: n * n }, (_, i) => i) as sq (sq)}
							{@const dark = (Math.floor(sq / n) + (sq % n)) % 2 === 1}
							<button
								type="button"
								class="sq"
								class:dark
								class:rock={!hexMode && pz?.rocks.includes(sq)}
								class:danger={!hexMode && showDanger && pz?.danger.includes(sq)}
								class:target={targets.includes(sq)}
								class:hint={!hexMode && hint === sq}
								class:picked={hexMode && selected === sq}
								class:bump={bump.sq === sq}
								aria-label="Square {sq + 1}"
								onclick={() => (hexMode ? tapHex(sq) : tapPath(sq))}
							>
								{#key bump.sq === sq ? bump.n : -1}<span class="shake"
										>{#if !hexMode && left.includes(sq)}<span class="star" out:fade={{ duration: 200 }}>⭐</span>{/if}</span
									>{/key}
							</button>
						{/each}
						{#if hexMode}
							{#each pawns as p (p.id)}
								<span class="token {p.side === 1 ? 'mine' : 'theirs'}" style={pos(p.at)} out:fade={{ duration: 250 }}>{GLYPH.pawn}</span>
							{/each}
						{:else if pz}
							{#if pz.guard}
								<span class="token theirs" style={pos(pz.guard.at)}>{GLYPH[pz.guard.piece]}</span>
							{/if}
							<span class="token mine" class:cheer={solved} style={pos(at)}>{GLYPH[pz.piece]}</span>
						{/if}
					</div>
				{/key}
			{/if}
		</section>
	{:else}
		{@const golds = grades.filter((g) => g === 'gold').length}
		<section class="stage">
			<div class="trophy" aria-label="Round done">{golds === round ? '🏆' : golds >= round - 2 ? '🥇' : '🥈'}</div>
			<div class="stars" aria-hidden="true">
				{#each grades as g, i (i)}
					<span class={g} style="--d: {i * 120}ms">★</span>
				{/each}
			</div>
			<button type="button" class="big-btn play" aria-label="Play level {level}" onclick={play}>▶</button>
		</section>
	{/if}
</main>

<style>
	main {
		position: relative;
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 5.5rem 1rem 2rem;
		overflow: hidden;
	}
	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: clamp(1.2rem, 4vh, 2.5rem);
		width: 100%;
	}
	.corner {
		position: absolute;
		top: 1rem;
		left: 1rem;
	}

	.icon,
	.big-btn,
	.flag,
	.lvl {
		border: var(--line) solid var(--ink);
		background: var(--paper);
		box-shadow: 0 var(--line) 0 var(--ink);
		color: inherit;
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.icon:active,
	.big-btn:active,
	.flag:active,
	.lvl:active {
		transform: translateY(var(--line));
		box-shadow: 0 0 0 var(--ink);
	}
	.icon {
		width: 3.5rem;
		height: 3.5rem;
		border-radius: 50%;
		font-size: 1.9rem;
		line-height: 1;
		display: grid;
		place-items: center;
	}
	.big-btn {
		border-radius: 22px;
		display: grid;
		place-items: center;
		line-height: 1;
	}
	.play {
		width: clamp(8rem, 26vw, 12rem);
		height: clamp(8rem, 26vw, 12rem);
		background: var(--sun);
		font-size: clamp(3.5rem, 11vw, 5.5rem);
		padding-left: 0.4em;
	}
	.ear {
		width: clamp(4rem, 12vw, 5rem);
		height: clamp(4rem, 12vw, 5rem);
		border-radius: 50%;
		font-size: clamp(1.8rem, 5vw, 2.4rem);
	}
	.flags,
	.levels {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 1rem;
	}
	.flags {
		gap: 2rem;
	}
	.flag {
		width: 5.5rem;
		height: 5.5rem;
		border-radius: 50%;
		font-size: 2.4rem;
	}
	.lvl {
		width: 3.6rem;
		height: 3.6rem;
		border-radius: 50%;
		font: inherit;
		font-size: 1.7rem;
		font-weight: 700;
	}
	.flag[aria-pressed='true'],
	.lvl[aria-pressed='true'] {
		box-shadow: 0 var(--line) 0 var(--ink), 0 0 0 6px var(--ink);
	}

	.dots {
		position: absolute;
		top: 1.4rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 0.6rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.dots li {
		width: clamp(1.6rem, 6vw, 2.4rem);
		height: clamp(1.6rem, 6vw, 2.4rem);
		border: 3px solid var(--ink);
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-size: clamp(1rem, 3.8vw, 1.5rem);
		line-height: 1;
	}
	.dots li.gold,
	.stars span.gold {
		background: var(--sun);
	}
	.dots li.silver,
	.stars span.silver {
		background: #c9ced6;
	}
	.dots li.bronze,
	.stars span.bronze {
		background: #e0a172;
	}

	/* The board: a grid of buttons, with pieces floated on top so moves slide. */
	.board {
		position: relative;
		container-type: inline-size;
		display: grid;
		grid-template-columns: repeat(var(--n), 1fr);
		grid-template-rows: repeat(var(--n), 1fr);
		width: min(30rem, 92vw, 58vh);
		aspect-ratio: 1;
		border: var(--line) solid var(--ink);
		border-radius: 14px;
		overflow: hidden;
		box-shadow: 0 var(--line) 0 var(--ink);
		animation: drop 260ms cubic-bezier(0.3, 1.4, 0.6, 1) backwards;
	}
	.sq {
		position: relative;
		border: 0;
		padding: 0;
		background: #fbf3e1;
		display: grid;
		place-items: center;
		font-size: calc(55cqw / var(--n));
		line-height: 1;
	}
	.sq.dark {
		background: #e3cfa6;
	}
	.sq.rock {
		background: #7b7f86;
		box-shadow: inset 0 0 0 calc(10cqw / var(--n)) #a3a7ad;
	}
	.sq.danger {
		background: #f4a3a3;
	}
	.sq.picked {
		background: #bfe3ff;
	}
	/* Where the piece can go: a soft dot, like on a real chess app. */
	.sq.target::after {
		content: '';
		position: absolute;
		width: 32%;
		aspect-ratio: 1;
		border-radius: 50%;
		background: rgb(0 0 0 / 0.22);
	}
	.sq.hint {
		animation: glow 1s ease-in-out infinite alternate;
	}
	@keyframes glow {
		to {
			background: var(--sun);
		}
	}
	.shake {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
	}
	.sq.bump .shake {
		animation: shake 300ms;
	}
	@keyframes shake {
		25% {
			transform: translateX(-12%);
		}
		75% {
			transform: translateX(12%);
		}
	}
	.token {
		position: absolute;
		width: calc(100% / var(--n));
		height: calc(100% / var(--n));
		display: grid;
		place-items: center;
		font-size: calc(78cqw / var(--n));
		line-height: 1;
		pointer-events: none;
		transition: left 300ms ease-in-out, top 300ms ease-in-out;
		-webkit-text-stroke: 2px var(--ink);
	}
	.token.mine {
		color: var(--blue);
	}
	.token.theirs {
		color: var(--red);
	}
	.token.cheer {
		animation: cheer 400ms ease-in-out;
	}

	@keyframes drop {
		from {
			opacity: 0;
			transform: translateY(-0.8rem) scale(0.96);
		}
	}
	@keyframes cheer {
		30% {
			transform: scale(1.15);
		}
	}

	.trophy {
		font-size: clamp(6rem, 24vw, 10rem);
		line-height: 1;
		animation: cheer 500ms ease-in-out;
	}
	.stars {
		display: flex;
		gap: 0.6rem;
	}
	.stars span {
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: 3px solid var(--ink);
		border-radius: 50%;
		font-size: 1.6rem;
		line-height: 1;
		animation: drop 400ms cubic-bezier(0.3, 1.6, 0.6, 1) backwards;
		animation-delay: var(--d);
	}
	@media (prefers-reduced-motion: reduce) {
		.board,
		.token,
		.sq.hint,
		.sq.bump .shake,
		.stars span,
		.trophy {
			animation: none;
			transition: none;
		}
	}
</style>
