<script module lang="ts">
	import './asset-frame.css';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/utils.js';
	import type { AssetFit } from './asset-types.js';

	const ASSET_FIT: Record<AssetFit, string> = {
		cover: 'object-cover',
		contain: 'object-contain',
		fill: 'object-fill',
		none: 'object-none'
	};

	export function assetMediaClass(fit: AssetFit = 'cover', className?: string) {
		return cn('absolute inset-0 size-full', ASSET_FIT[fit], className);
	}

	type AssetFrameProps = {
		width: number;
		height: number;
		className?: string;
		children: Snippet;
	};
</script>

<script lang="ts">
	let { width, height, className, children }: AssetFrameProps = $props();
</script>

<div
	style="--asset-ratio: {`${width} / ${height}`}"
	class={cn('fl-asset-frame', className)}
>
	{@render children?.()}
</div>
