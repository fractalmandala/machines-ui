<script module lang="ts">
	import './flow-item.css';
	import { clsx } from 'clsx';
	import Button from '$lib/components/ui/button.svelte';
	import FlowNode from '$lib/components/flow/FlowNode.svelte';
	import type { PortId, FlowNodeData as NodeData } from '$lib/stores/flow-store.svelte';
	import { ACTIONS } from './flow-actions.js';
	import { inputSide, outputsOf } from './flow-geometry.js';

	type FlowItemProps = {
		node: NodeData;
		selected: boolean;
		targeted: boolean;
		dragging: boolean;
		runState: 'active' | 'done' | 'idle';
		onMeasure: (id: string, height: number) => void;
		onNodePointerDown: (id: string, event: PointerEvent) => void;
		onHandlePointerDown: (id: string, event: PointerEvent, port?: PortId) => void;
		onOpen: (id: string) => void;
		editing: boolean;
	};
</script>

<script lang="ts">
	let {
		node,
		selected,
		targeted,
		dragging,
		runState,
		onMeasure,
		onNodePointerDown,
		onHandlePointerDown,
		onOpen,
		editing
	}: FlowItemProps = $props();

	let ref = $state<HTMLDivElement | null>(null);

	const action = $derived(ACTIONS[node.kind]);
	const Icon = $derived(action.Icon);
	const view = $derived(node.view ?? {});
	const accent = $derived(view.accent ?? action.accent);

	// what a FlowNode takes whatever its look; the node's own record and the run supply it
	const shared = $derived({
		title: action.label,
		status: view.status ?? (runState === 'active' ? 'running' : runState === 'done' ? 'done' : 'idle'),
		statusLabel: view.statusLabel,
		selected,
		badge: view.badge ?? (node.kind === 'trigger' ? 'IF' : undefined),
		input: inputSide(node),
		outputs: outputsOf(node),
		pad: view.pad,
		accent
	} as const);

	// a press on a port starts a link; it must not also pick the node up
	function portdown(port: 'in' | PortId, event: PointerEvent) {
		event.stopPropagation();

		if (port !== 'in') onHandlePointerDown(node.id, event, port);
	}

	$effect(() => {
		const element = ref;
		if (!element) return;
		const observer = new ResizeObserver(() => onMeasure(node.id, element.offsetHeight));
		observer.observe(element);
		return () => observer.disconnect();
	});
</script>

{#snippet icon()}<Icon aria-hidden class="fl-flow-item-icon" />{/snippet}

{#snippet body()}
	<strong>{node.title}</strong>
	<p>{node.description}</p>
{/snippet}

<div
	bind:this={ref}
	data-node={node.id}
	data-selected={selected || undefined}
	data-targeted={targeted || undefined}
	data-dragging={dragging || undefined}
	data-run={runState === 'idle' ? undefined : runState}
	style="--node-x: {`${node.x}px`}; --node-y: {`${node.y}px`}; --node-accent: {accent}"
	class={clsx(
		action.theme,
		'fs-absolute fl-flow-item-group-node fl-flow-item',
		node.fresh && 'fl-flow-item-1'
	)}
>
	<div
		role="button"
		tabindex="0"
		onpointerdown={(event) => onNodePointerDown(node.id, event)}
		ondblclick={() => onOpen(node.id)}
		class="fl-flow-item-button"
	>
		{#if view.look === 'frame'}
			<!-- the frame's own props apply only to the frame look -->
			<FlowNode
				{...shared}
				{icon}
				onportdown={portdown}
				dash={view.dash}
				motion={view.motion}
				speed={view.speed}
				easing={view.easing}
				pauseOnHover={view.pauseOnHover}
				cornerBlink={view.cornerBlink}
				corner={view.corner}
			>
				{@render body()}
			</FlowNode>
		{:else}
			<FlowNode look="card" {...shared} {icon} onportdown={portdown}>
				{@render body()}
			</FlowNode>
		{/if}
	</div>
	{#if selected && !dragging && !editing}
		<div
			role="group"
			onpointerdown={(event) => event.stopPropagation()}
			class="fs-absolute fl-flow-item-group"
		>
			<Button variant="field" size="xs" onClick={() => onOpen(node.id)}>Edit</Button>
		</div>
	{/if}
</div>
