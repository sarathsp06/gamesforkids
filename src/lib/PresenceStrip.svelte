<script lang="ts">
	/**
	 * Who else is painting: the child's own face first, then remembered friends (a heart, and the only faces a
	 * child can tap, to invite), then other children. No names, no numbers, at most six faces.
	 */
	import Avatar from './Avatar.svelte';
	import { STRIP_MAX } from './presence';

	let {
		me,
		peers,
		friends,
		onFriend
	}: {
		me: number;
		peers: Record<string, { avatar: number }>;
		friends: Record<string, number>;
		onFriend: (key: string) => void;
	} = $props();

	const friendList = $derived(Object.entries(friends).slice(0, STRIP_MAX - 1));
	const others = $derived(Object.entries(peers).slice(0, Math.max(0, STRIP_MAX - 1 - friendList.length)));
</script>

<div class="strip" aria-label="Children painting now">
	<span class="face me"><Avatar avatar={me} size="100%" /></span>
	{#each friendList as [key, avatar] (key)}
		<button type="button" class="face friend" aria-label="Your friend" onclick={() => onFriend(key)}>
			<Avatar {avatar} size="100%" />
			<svg class="heart" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.8 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3.1 1.8-2 3.3-3.1 5.4-3.1 3.6 0 5.8 3.8 4.2 7.3C19.5 16.4 12 21 12 21z" /></svg>
		</button>
	{/each}
	{#each others as [peer, p] (peer)}
		<span class="face"><Avatar avatar={p.avatar} size="100%" /></span>
	{/each}
</div>

<style>
	.strip {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: nowrap;
	}
	.face {
		position: relative;
		display: block;
		width: 48px;
		height: 48px;
		padding: 0;
		border: 0;
		background: none;
		animation: arrive 400ms ease-out;
	}
	.face.me {
		width: 60px;
		height: 60px;
		animation: none;
	}
	.friend {
		cursor: pointer;
		width: 56px;
		height: 56px;
	}
	.friend:active {
		transform: translateY(2px);
	}
	.heart {
		position: absolute;
		right: -4px;
		bottom: -2px;
		width: 22px;
		height: 22px;
		fill: var(--red);
		stroke: var(--ink);
		stroke-width: 2;
	}
	@keyframes arrive {
		from {
			opacity: 0;
			transform: scale(0.6);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.face {
			animation: none;
		}
	}
</style>
