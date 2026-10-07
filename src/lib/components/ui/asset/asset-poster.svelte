<script module lang="ts">
	import './asset-poster.css';
	import { cn } from '$lib/utils/utils.js';
	import { assetMediaClass } from './asset-frame.svelte';
	import type { AssetFit } from './asset-types.js';

	type AssetPosterProps = {
		src: string;
		alt?: string;
		fit?: AssetFit;
		visible?: boolean;
		className?: string;
	};
</script>

<script lang="ts">
	let { src, alt = '', fit, visible = true, className }: AssetPosterProps = $props();
</script>

<img
	{src}
	{alt}
	loading="eager"
	decoding="async"
	class={assetMediaClass(
		fit,
		cn(
			'fl-asset-poster',
			visible ? 'fl-asset-poster-1' : 'fl-asset-poster-2',
			className
		)
	)}
/>
