<script lang="ts">
	import { onMount } from 'svelte';
	import { Frame } from '$lib/components/index.js';
	import FlowCanvas from '$lib/components/flow/canvas/flow-canvas.svelte';
	import { ACTIONS } from '$lib/components/flow/canvas/flow-actions.js';
	import {
		loadGraph,
		openInspector,
		select,
		flow,
		type ActionKind
	} from '$lib/stores/flow-store.svelte';
	import CopyCode from '$site/components/stage/copy-code.svelte';

	// The playground is the canvas itself: one node to start. Its props are edited where a flow
	// editor edits them, in the node inspector (double-click a node), and every look setting is saved
	// on the node as its `view`, so what you set is exactly what a saved flow holds.
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
		openInspector(ID, 'build');
	});

	// the node the code below describes: the last one selected
	let activeId = $state(ID);

	$effect(() => {
		const selection = flow.selection;

		if (selection?.type === 'node') activeId = selection.id;
	});

	const node = $derived(flow.nodes.find((item) => item.id === activeId));
	const view = $derived(node?.view ?? {});

	// the node as a FlowNode would be written, and as the flow stores it
	const markup = $derived.by(() => {
		if (!node) return '';

		const action = ACTIONS[node.kind];
		const attrs = [`title="${action.label}"`];

		if (view.look === 'card') attrs.push('look="card"');
		if (view.badge !== undefined) attrs.push(view.badge ? `badge="${view.badge}"` : 'badge=""');
		if (view.status) attrs.push(`status="${view.status}"`);
		if (view.statusLabel === false) attrs.push('statusLabel={false}');
		else if (view.statusLabel) attrs.push(`statusLabel="${view.statusLabel}"`);
		if (node.input !== undefined) attrs.push(node.input === false ? 'input={false}' : `input="${node.input}"`);
		if (node.outputs) attrs.push(`outputs={[${node.outputs.map((port) => `{ id: '${port.id}', side: '${port.side}' }`).join(', ')}]}`);
		if (view.pad) attrs.push(`pad="${view.pad}"`);
		attrs.push(`accent="${view.accent ?? action.accent}"`);

		if (view.look === 'frame') {
			if (view.dash) attrs.push(`dash="${view.dash}"`);
			if (view.motion) attrs.push(`motion="${view.motion}"`);
			if (view.speed !== undefined) attrs.push(`speed={${view.speed}}`);
			if (view.easing) attrs.push(`easing="${view.easing}"`);
			if (view.pauseOnHover) attrs.push('pauseOnHover');
			if (view.cornerBlink !== undefined) attrs.push(`cornerBlink={${view.cornerBlink}}`);
			if (view.corner) attrs.push(`corner="${view.corner}"`);
		}

		return [`<FlowNode ${attrs.join(' ')}>`, `  <strong>${node.title}</strong>`, `  <p>${node.description}</p>`, '</FlowNode>'].join('\n');
	});

	const record = $derived(
		node
			? JSON.stringify({ kind: node.kind, title: node.title, description: node.description, input: node.input, outputs: node.outputs, view: node.view }, null, 2)
			: ''
	);
</script>

<section class="fs-sf" style="width: 100%">
<FlowCanvas />
		<Frame title="CODE" pad="md">
			<div class="controls">
				<CopyCode text={markup}>
					<pre class="code"><code>{markup}</code></pre>
				</CopyCode>
				<CopyCode text={record}>
					<pre class="code"><code>{record}</code></pre>
				</CopyCode>
			</div>
		</Frame>
</section>

<style>
	.code {
		margin: 0;
		text-align: left;
		white-space: pre;
		overflow-x: auto;
	}

	.controls {
		display: grid;
		gap: 0.9rem;
	}


</style>
