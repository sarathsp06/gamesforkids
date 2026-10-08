<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head><title>How we score — for parents</title></svelte:head>

<main>
	<a class="icon" href={resolve('/')} aria-label="All games">⌂</a>

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
		<ul>
			<li><strong>Off by one</strong> — 8 for 7. A counting slip; the method was right.</li>
			<li><strong>Close in size</strong> — 56 for 57. The child knows roughly how big the answer is.</li>
			<li>
				<strong>Swapped digits</strong> — 47 for 74. Very common for Dutch speakers, because Dutch says the
				ones first: <em>vier-en-zeventig</em>.
			</li>
		</ul>
		<h3>Words (Spell Pick)</h3>
		<p>
			The child hears a word and picks it from three different real words — <em>book</em>, <em>car</em>,
			<em>cat</em>. A different word is a different meaning, so there is no “almost” here: <em>mouse</em> is not
			<em>house</em>. A wrong pick simply gets a soft sound and another try.
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
