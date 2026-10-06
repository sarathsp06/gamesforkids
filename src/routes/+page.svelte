<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<main>
	<nav aria-label="Games">
		<a class="game letters" href={resolve('/letter-leap')} aria-label="Letter Leap">
			<span class="caps" aria-hidden="true"><b class="l">A</b><b class="r">B</b></span>
		</a>
		<a class="game numbers" href={resolve('/math')} aria-label="Number Dash">
			<span class="caps" aria-hidden="true"><b>1</b><i>+</i><b>2</b></span>
		</a>
		<a class="game spelling" href={resolve('/spell')} aria-label="Spell Pick">
			<span class="caps" aria-hidden="true"><i>🔊</i><b class="g">C</b></span>
		</a>
	</nav>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-items: center;
		padding: 2rem 1rem;
	}
	nav {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: clamp(1.5rem, 5vw, 3.5rem);
	}
	.game {
		display: grid;
		place-items: center;
		width: clamp(14rem, 36vw, 20rem);
		aspect-ratio: 1;
		border: var(--line) solid var(--ink);
		border-radius: 28px;
		box-shadow: 0 8px 0 var(--ink);
		color: inherit;
		text-decoration: none;
		transition: transform 120ms, box-shadow 120ms;
	}
	.game:active {
		transform: translateY(8px);
		box-shadow: 0 0 0 var(--ink);
	}
	.letters {
		background: var(--paper);
	}
	.numbers {
		background: var(--sun);
	}
	.spelling {
		background: var(--paper);
	}
	b.g {
		background: var(--leaf);
		color: var(--paper);
	}
	.caps {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: clamp(3rem, 9vw, 5rem);
		font-weight: 700;
		line-height: 1;
	}
	b {
		display: grid;
		place-items: center;
		width: 1.4em;
		height: 1.5em;
		border: var(--line) solid var(--ink);
		border-radius: 14px;
		box-shadow: 0 var(--line) 0 var(--ink);
		background: var(--paper);
	}
	b.l {
		background: var(--red);
		color: var(--paper);
	}
	b.r {
		background: var(--blue);
		color: var(--paper);
	}
	i {
		font-style: normal;
	}
</style>
