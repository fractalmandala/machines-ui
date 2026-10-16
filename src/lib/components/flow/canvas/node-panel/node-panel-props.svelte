<script module lang="ts">
	import './node-panel-build.css';
	import type { FlowNodeData } from '$lib/stores/flow-store.svelte';
	import NodePanelLook from './node-panel-look.svelte';
	import NodePanelPorts from './node-panel-ports.svelte';

	type NodePanelPropsProps = {
		node: FlowNodeData;
	};
</script>

<script lang="ts">
	let { node }: NodePanelPropsProps = $props();
</script>

<div class="fs-box fs-gap-bs">
	<div class="fs-box fs-gap-xs">
		<span class="fl-node-panel-build-section">Look</span>
		<div class="fs-pt-sm fs-pb-xs"><NodePanelLook {node} /></div>
	</div>
	<div class="fs-box fs-gap-xs">
		<span class="fl-node-panel-build-section">Ports</span>
		<div class="fs-pt-sm fs-pb-xs"><NodePanelPorts {node} /></div>
	</div>
</div>
