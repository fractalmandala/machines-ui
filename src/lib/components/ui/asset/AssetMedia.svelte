<script lang="ts">
	import AssetImage from './asset-image.svelte';
	import AssetVideo from './asset-video.svelte';
	import type { AssetProps } from './asset-types.js';

	let props: AssetProps = $props();
</script>

{#if props.type === 'video'}
	<AssetVideo {...props} />
{:else}
	<AssetImage {...props} />
{/if}
