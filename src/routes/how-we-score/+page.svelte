<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>How we score — for parents</title></svelte:head>

<main>
	<a class="icon" href={resolve('/grownups')} aria-label="Back">‹</a>

	<article>
		<h1>How we score</h1>
		<p class="lead">
			A short note for parents and teachers. Young children learn from <em>what was right</em>, not from being
			told they were wrong — so every answer is judged by <strong>how close</strong> it was, not just right or wrong.
		</p>

		<h2>Three kinds of answer</h2>
		<ul class="kinds">
			<li>
				<span class="badge gold">★</span>
				<div>
					<strong>Correct</strong> — right on the first try. A gold star.
				</div>
			</li>
			<li>
				<span class="badge near">~</span>
				<div>
					<strong>Almost</strong> — wrong, but wrong in a way that shows real understanding. The answer glows warm
					amber (Spell Pick also says <em>“Almost!”</em>), and the child tries again. One near miss still earns a
					silver star.
				</div>
			</li>
			<li>
				<span class="badge far">○</span>
				<div>
					<strong>Not yet</strong> — a guess that's far off. A soft sound, a little wobble, try again. More than one
					miss, or any far miss, gives a bronze star.
				</div>
			</li>
		</ul>
		<p>
			Every question still needs the exact answer before the game moves on. Stars only tell you how it went. Nothing
			is crossed out or called “failed”.
		</p>

		<h2>What counts as “almost”</h2>
		<h3>Letters (Letter Leap)</h3>
		<ul>
			<li><strong>Next-door keys</strong> — pressing R instead of T. A finger slip, not a reading mistake.</li>
			<li><strong>Mirror letters</strong> — b/d, p/q, m/w, n/u. Mixing these up is normal until about age 7.</li>
			<li><strong>Same sound</strong> — c/k, s/z, f/v, g/j. The child heard the sound correctly.</li>
		</ul>
		<h3>Numbers (Number Dash)</h3>
		<p>
			Sums have one right answer: 5 + 3 is 8, and 6 is simply wrong. So <strong>levels 1–5 are plain right or
			wrong</strong>. From <strong>level 6</strong>, when the sums get long, two slips count as almost — because they
			show the child knew how to get there:
		</p>
		<ul>
			<li><strong>Off by one</strong> — 7 or 9 for 8. A counting slip; the method was right.</li>
			<li>
				<strong>Swapped digits</strong> — 47 for 74. Very common for Dutch speakers, because Dutch says the
				ones first: <em>vier-en-zeventig</em>.
			</li>
		</ul>
		<p>Anything else — 6 for 8, 67 for 57 — is “not yet”.</p>
		<h3>Words (Spell Pick)</h3>
		<p>
			The child hears a word and picks the right spelling. In English and Dutch the same sound can be written in
			different ways (<em>c</em> and <em>k</em>, <em>s</em> and <em>z</em>, Dutch <em>ei</em> and <em>ij</em>), so
			the game grows in four levels:
		</p>
		<ol>
			<li><strong>Clearly different words</strong> — <em>cat</em>, <em>book</em>, <em>bus</em>.</li>
			<li><strong>Real words that look alike</strong> — <em>cat</em>, <em>car</em>, <em>candy</em>.</li>
			<li>
				<strong>A spelling that sounds right</strong> — <em>cat</em>, <em>kat</em>, <em>bus</em>.
				<em>cat</em> is correct (gold), <em>kat</em> is almost: it sounds exactly right, just spelled differently
				(silver). <em>bus</em> is a different word: not yet.
			</li>
			<li><strong>Both together</strong> — <em>cat</em>, <em>kat</em>, <em>car</em>.</li>
		</ol>
		<p>
			Four first-try words in a round of five moves the child up a level. Writing a word the way it sounds is a
			normal stage of learning to spell and a good sign for reading — but a different first sound
			(<em>mouse</em> for <em>house</em>) is a different word, so it never counts as almost.
		</p>
		<h3>Shapes (Shape Sense)</h3>
		<p>
			Everything is spoken and tapped, so no reading is needed. Seven levels, each building on the one before:
		</p>
		<ol>
			<li><strong>Find the shape</strong> — circle, triangle, square, rectangle, standing upright.</li>
			<li>
				<strong>Turned and stretched</strong> — a thin, tilted triangle is still a triangle. Young children often
				only accept the “standard” upright one; this is the main shape lesson at this age.
			</li>
			<li>
				<strong>Is it really one?</strong> — next to the real triangle sits one with a gap or a curved side. Picking
				it is almost: it looks right, but a triangle needs straight sides, all joined up.
			</li>
			<li><strong>Odd one out</strong> — three of one shape in different sizes and turns, and one that's different.</li>
			<li>
				<strong>What comes next?</strong> — ● ▲ ● ▲ ● ?. The right shape in the wrong colour is almost: the child saw
				half the pattern.
			</li>
			<li>
				<strong>How many circles?</strong> — circles in a chain, each partly behind the next. One off is almost:
				the child skipped a half-hidden one or counted one twice.
			</li>
			<li>
				<strong>How many triangles?</strong> — triangles mixed with circles and squares; only triangles count. One
				off is almost.
			</li>
		</ol>
		<p>
			After a right answer the game says what makes the shape (“A triangle has three sides.”) or repeats the count,
			and waits until it has finished speaking before the next question.
		</p>

		<h3>Chess thinking (Chess Path)</h3>
		<p>
			Each puzzle has a known shortest way, so we can tell how close a solution was, not just whether it worked:
		</p>
		<ol>
			<li><strong>Rook</strong> — straight lines, one star on a small board.</li>
			<li><strong>Rook with rocks</strong> — two stars; rocks block the way, and a star stops the rook until it's taken.</li>
			<li><strong>Bishop</strong> — slanted lines.</li>
			<li><strong>Knight</strong> — the horse jumps two steps, then one to the side.</li>
			<li><strong>Knight, two stars</strong> — the move dots now appear only after a wrong tap.</li>
			<li>
				<strong>The guard</strong> — a red rook or bishop watches some squares. Stopping there is caught, and the
				watched squares turn red. The safe way is always longer, so the child has to look before moving.
			</li>
			<li><strong>Hexapawn, easy</strong> — three pawns each on a 3×3 board, against a computer that plays any move.</li>
			<li>
				<strong>Hexapawn, smart</strong> — the computer plays its best. Whoever moves second can always win, and the
				computer moves first, so every game is winnable with good moves.
			</li>
		</ol>
		<p>
			The fewest moves is gold. One extra move is almost: the child found a way, just not the shortest. The game
			says so (“You can do it in four moves!”). After two wasted moves the next good square glows, so a stuck child
			gets a nudge instead of tapping at random.
		</p>

		<h3>Reading aloud (Read Along)</h3>
		<p>
			The child reads a fable aloud, one sentence at a time. The game knows the sentence, so it doesn't need a perfect
			transcript: it checks the words in order, and a word that sounds close (“kat” for “cat”) still counts. Each word
			gets its own colour:
		</p>
		<ul>
			<li><strong>Green</strong>: read alone.</li>
			<li><strong>Amber</strong>: read after the word started to glow (after 4 seconds without progress).</li>
			<li><strong>Bronze</strong>: the game said it (after 8 seconds, or when the child tapped it).</li>
		</ul>
		<p>
			A sentence with every word green is gold; with no word said for the child, silver; otherwise bronze. The
			browser asks once for the microphone. Speech is recognised on the device where the browser can, otherwise in the
			browser's speech service (Apple on iPad, Google in Chrome). The app itself keeps no audio. The game only works when it
			can hear the child: if the browser can't listen, the microphone is blocked or missing, or no words come
			through, it stops and says what's wrong and how to fix it.
		</p>

		<h2>Why</h2>
		<ul>
			<li>Children under about 11 learn much less from “wrong!” than from “right!” — so near misses are rewarded.</li>
			<li>
				A near miss shows what the child already knows. Treating it like a wild guess would hide that progress — from
				them and from you.
			</li>
			<li>Stars, not points. No leaderboards, no prizes to chase.</li>
		</ul>
	</article>
</main>

<style>
	main {
		min-height: 100dvh;
		padding: 1.5rem 1rem 4rem;
	}
	.icon {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		box-shadow: 0 4px 0 var(--ink);
		background: var(--paper);
		color: inherit;
		text-decoration: none;
		font-size: 1.4rem;
	}
	article {
		max-width: 38rem;
		margin: 0 auto;
		font-size: 1.1rem;
		line-height: 1.6;
	}
	h1 {
		font-size: 2.2rem;
		margin: 0.5rem 0 0.5rem;
	}
	h2 {
		margin-top: 2.2rem;
	}
	h3 {
		margin: 1.2rem 0 0.3rem;
	}
	.lead {
		font-size: 1.25rem;
	}
	ul {
		padding-left: 1.2rem;
	}
	li {
		margin: 0.35rem 0;
	}
	.kinds {
		list-style: none;
		padding: 0;
	}
	.kinds li {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin: 1rem 0;
	}
	.badge {
		flex: none;
		display: grid;
		place-items: center;
		width: 2.6rem;
		height: 2.6rem;
		border: var(--line) solid var(--ink);
		border-radius: 50%;
		font-weight: 700;
	}
	.gold {
		background: var(--sun);
	}
	.near {
		background: #ffe2a8;
	}
	.far {
		background: #e0a172;
	}
</style>
