<script lang="ts" module>
	/**
	 * One drawn emoji (Microsoft's Fluent Emoji, flat, MIT), the same on every device. scripts/emoji_fetch.py
	 * puts an SVG per glyph in static/emoji/; it is loaded as a plain file only when shown, so no page carries
	 * the pictures in its JavaScript. A glyph without one falls back to the device's own.
	 */
	import { asset } from '$app/paths';
	import { EMOJI_KEYS } from './emoji-keys';

	const key = (glyph: string) =>
		[...glyph]
			.filter((c) => c !== '\ufe0f')
			.map((c) => c.codePointAt(0)!.toString(16))
			.join('-');
	export const emojiUrl = (glyph: string): string | undefined => {
		const k = key(glyph);
		return EMOJI_KEYS.has(k) ? asset(`emoji/${k}.svg` as Parameters<typeof asset>[0]) : undefined;
	};
	/** Splits a string of emoji into glyphs (joined sequences stay together). */
	export const glyphs = (text: string): string[] =>
		text.match(/\p{Extended_Pictographic}\ufe0f?(?:\u200d\p{Extended_Pictographic}\ufe0f?)*/gu) ?? [];
</script>

<script lang="ts">
	let { glyph, size = '1em', label }: { glyph: string; size?: number | string; label?: string } = $props();
	const url = $derived(emojiUrl(glyph));
</script>

{#if url}
	<img class="emoji" src={url} alt={label ?? ''} role={label ? 'img' : undefined} aria-hidden={label ? undefined : true} style="--s: {typeof size === 'number' ? `${size}px` : size}" draggable="false" decoding="async" />
{:else}
	<span class="emoji text" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} style="--s: {typeof size === 'number' ? `${size}px` : size}">{glyph}</span>
{/if}

<style>
	.emoji {
		display: inline-block;
		width: var(--s);
		height: var(--s);
		vertical-align: middle;
		flex: none;
	}
	.text {
		font-size: calc(var(--s) * 0.85);
		line-height: var(--s);
		text-align: center;
	}
</style>
