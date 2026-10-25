<script lang="ts" module>
	/**
	 * One drawn emoji (Microsoft's Fluent Emoji, flat, MIT), the same on every device. scripts/emoji_fetch.py
	 * puts an SVG per glyph in assets/emoji; a glyph without one falls back to the device's own.
	 */
	const files = import.meta.glob('./assets/emoji/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
	const byKey: Record<string, string> = {};
	for (const [path, url] of Object.entries(files)) byKey[path.split('/').pop()!.replace('.svg', '')] = url;

	const key = (glyph: string) =>
		[...glyph]
			.filter((c) => c !== '️')
			.map((c) => c.codePointAt(0)!.toString(16))
			.join('-');
	export const emojiUrl = (glyph: string): string | undefined => byKey[key(glyph)];
	/** Splits a string of emoji into glyphs (joined sequences stay together). */
	export const glyphs = (text: string): string[] =>
		text.match(/\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*/gu) ?? [];
</script>

<script lang="ts">
	let { glyph, size = '1em', label }: { glyph: string; size?: number | string; label?: string } = $props();
	const url = $derived(emojiUrl(glyph));
</script>

{#if url}
	<img class="emoji" src={url} alt={label ?? ''} role={label ? 'img' : undefined} aria-hidden={label ? undefined : true} style="--s: {typeof size === 'number' ? `${size}px` : size}" draggable="false" />
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
