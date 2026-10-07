<script module lang="ts">
	import { assetMediaClass } from './asset-frame.svelte';
	import type { AssetImageProps, AssetImageSource, AssetSvgComponent } from './asset-types.js';

	function isSvgComponent(src: AssetImageSource): src is AssetSvgComponent {
		return typeof src === 'function';
	}

	function resolveSrc(src: AssetImageSource): string {
		if (typeof src === 'string') return src;
		if (typeof src === 'object' && src !== null && 'src' in src)
			return (src as { src: string }).src;
		return '';
	}
</script>

<script lang="ts">
	let { src, alt, fit, mediaClassName, blurDataURL, priority, loading }: AssetImageProps = $props();
</script>

{#if isSvgComponent(src)}
	{@const Svg = src}
	<Svg
		role={alt ? 'img' : undefined}
		aria-label={alt || undefined}
		aria-hidden={alt ? undefined : true}
		class={assetMediaClass(fit, mediaClassName)}
	/>
{:else}
	<img
		src={resolveSrc(src)}
		{alt}
		loading={priority ? 'eager' : (loading ?? 'lazy')}
		decoding="async"
		style={blurDataURL ? `background-image:url("${blurDataURL}")` : undefined}
		class={assetMediaClass(fit, mediaClassName)}
	/>
{/if}
