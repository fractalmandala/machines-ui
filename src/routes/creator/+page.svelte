<script lang="ts">
	import { onMount } from 'svelte';
	import FlowCanvas from '$lib/components/flow/canvas/flow-canvas.svelte';
	import { loadGraph, openInspector, select, type ActionKind } from '$lib/stores/flow-store.svelte';

	// The playground is the canvas itself: one node to start. Its props are edited in the node inspector,
	// and every look setting is saved on the node as its `view`, so what you set is what a saved flow holds.
	const ID = 'core';

	const seed = () => ({
		nodes: [
			{
				id: ID,
				kind: 'send-email' as ActionKind,
				x: 0,
				y: 0,
				title: 'Core Template',
				description: 'Triggered when scaffold begins.',
				view: { badge: 'type' }
			}
		],
		edges: []
	});

	onMount(() => {
		loadGraph('playground', seed);
		select({ type: 'node', id: ID });
		openInspector(ID, 'props');
	});
</script>

<section class="fs-sf" style="width: 100%">
	<FlowCanvas />
</section>
