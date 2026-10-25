<script lang="ts" module>
	/**
	 * The chrome icons: Google's Material Symbols (Rounded, weight 600, Apache-2.0), one SVG each, inlined so
	 * they take the current colour; and real country flags from circle-flags (MIT). Add a name here and it
	 * works everywhere; only the icons named are bundled.
	 */
	import home from '@material-symbols/svg-600/rounded/home.svg?raw';
	import play from '@material-symbols/svg-600/rounded/play_arrow-fill.svg?raw';
	import speaker from '@material-symbols/svg-600/rounded/volume_up-fill.svg?raw';
	import star from '@material-symbols/svg-600/rounded/star-fill.svg?raw';
	import gear from '@material-symbols/svg-600/rounded/settings.svg?raw';
	import undo from '@material-symbols/svg-600/rounded/undo.svg?raw';
	import brush from '@material-symbols/svg-600/rounded/brush.svg?raw';
	import bucket from '@material-symbols/svg-600/rounded/format_color_fill.svg?raw';
	import check from '@material-symbols/svg-600/rounded/check.svg?raw';
	import book from '@material-symbols/svg-600/rounded/menu_book.svg?raw';
	import plus from '@material-symbols/svg-600/rounded/add.svg?raw';
	import close from '@material-symbols/svg-600/rounded/close.svg?raw';
	import lock from '@material-symbols/svg-600/rounded/lock.svg?raw';
	import mic from '@material-symbols/svg-600/rounded/mic.svg?raw';
	import retry from '@material-symbols/svg-600/rounded/refresh.svg?raw';
	import games from '@material-symbols/svg-600/rounded/grid_view.svg?raw';
	import back from '@material-symbols/svg-600/rounded/arrow_back.svg?raw';
	import friends from '@material-symbols/svg-600/rounded/group-fill.svg?raw';
	import timer from '@material-symbols/svg-600/rounded/timer.svg?raw';
	import flagNl from 'circle-flags/flags/nl.svg';
	import flagEn from 'circle-flags/flags/gb.svg';

	const SYMBOLS = { home, play, speaker, star, gear, undo, brush, bucket, check, book, plus, close, lock, mic, retry, games, back, friends, timer };
	const FLAGS = { nl: flagNl, en: flagEn };
	export type IconName = keyof typeof SYMBOLS | keyof typeof FLAGS;

	/** The symbol's path only: sized and coloured here, not by the file. */
	const paths = (svg: string) => svg.replace(/^.*?<svg[^>]*>/s, '').replace(/<\/svg>\s*$/, '');
</script>

<script lang="ts">
	let { name, size = 24 }: { name: IconName; size?: number | string } = $props();
</script>

{#if name in FLAGS}
	<img class="icon icon-{name}" src={FLAGS[name as keyof typeof FLAGS]} width={size} height={size} alt="" draggable="false" />
{:else}
	<svg class="icon icon-{name}" width={size} height={size} viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
		{@html paths(SYMBOLS[name as keyof typeof SYMBOLS])}
	</svg>
{/if}

<style>
	.icon {
		display: block;
		flex: none;
	}
	img.icon {
		border-radius: 50%;
	}
</style>
