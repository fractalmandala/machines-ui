<script lang="ts">
	import Video from '$lib/components/ui/video.svelte';
	import { assetMediaClass } from './asset-frame.svelte';
	import type { AssetVideoProps } from './asset-types.js';

	let { src, mobileSrc, poster, stillPoster, fit, mediaClassName }: AssetVideoProps = $props();
</script>

<Video {src} {mobileSrc} {poster} {stillPoster} className={assetMediaClass(fit, mediaClassName)} />
