<script lang="ts">
	import AssetFrame from './asset-frame.svelte';
	import type { AssetProps } from './asset-types.js';
	import AssetMedia from './AssetMedia.svelte';

	let props: AssetProps = $props();
</script>

<AssetFrame width={props.width} height={props.height} className={props.className}>
	<AssetMedia {...props} />
</AssetFrame>
