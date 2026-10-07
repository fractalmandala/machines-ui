<script module lang="ts">
	import './node-panel-status.css';
	import type { FlowNodeData } from '$lib/stores/flow-store.svelte';
	import { cn } from '$lib/utils/utils.js';
	import { ACTIONS } from '../flow-actions.js';

	type NodePanelStatusProps = {
		node: FlowNodeData;
	};

	function seeded(id: string) {
		let hash = 0;
		for (const character of id) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
		return (hash % 1000) / 1000;
	}

	function relative(time: number | null) {
		if (!time) return 'Never';
		const seconds = Math.max(1, Math.round((Date.now() - time) / 1000));
		if (seconds < 60) return `${seconds}s ago`;
		const minutes = Math.round(seconds / 60);
		if (minutes < 60) return `${minutes}m ago`;
		return `${Math.round(minutes / 60)}h ago`;
	}
</script>

<script lang="ts">
	import { flow } from '$lib/stores/flow-store.svelte';
	import { app } from '$lib/stores/app-store.svelte';

	let { node }: NodePanelStatusProps = $props();

	const run = $derived(flow.run);

	const edges = $derived(flow.edges);

	const logs = $derived(flow.logs);

	const automation = $derived(app.automations.find((item) => item.id === app.automationId));

	let action = $derived(ACTIONS[node.kind]);

	let lastLog = $derived([...logs].reverse().find((log) => log.nodeId === node.id));

	let state = $derived(
		run.activeNodeId === node.id
			? 'fl-node-panel-status-state'
			: run.visited.includes(node.id)
				? 'done'
				: lastLog
					? 'idle'
					: 'never'
	);

	let label = $derived(
		{
			running: 'Running now',
			done: 'Completed in the last test run',
			idle: 'Ready',
			never: 'Waiting for its first run'
		}[state]
	);

	let base = $derived(automation?.started ?? 0);

	let ratio = $derived(0.55 + seeded(node.id) * 0.4);

	let entered = $derived(Math.round(base * (0.7 + seeded(`${node.id}-in`) * 0.3)));

	let completed = $derived(Math.round(entered * ratio));

	let dropOff = $derived(entered ? Math.round((1 - completed / entered) * 100) : 0);

	let incoming = $derived(edges.filter((edge) => edge.target === node.id).length);

	let outgoing = $derived(edges.filter((edge) => edge.source === node.id).length);

	let truthy = $derived(Math.round(40 + seeded(`${node.id}-branch`) * 40));

	let metrics = $derived([
		{ label: 'Entered', value: entered.toLocaleString() },
		{ label: 'Completed', value: completed.toLocaleString() },
		{ label: 'Drop-off', value: `${dropOff}%` }
	]);
</script>

<div class={cn('fs-box fs-gap-bs', action.theme)}>
	<div
		class="fs-row fs-ycenter fs-gap-md fs-py-md fl-node-panel-status-div"
	>
		<span class="fs-relative fs-row fs-shrink-0 fl-node-panel-status-span">
			{#if state === 'running'}
				<span
					class="fs-absolute fs-radius-full fl-node-panel-status-span-2"
				></span>
			{/if}
			<span
				class={cn(
					'fs-relative fs-radius-full fl-node-panel-status-span-3',
					state === 'never' ? 'fl-node-panel-status-span-3-2' : 'fl-node-panel-status-span-3-3'
				)}
			></span>
		</span>
		<div class="fs-minw0 fs-grow fs-box">
			<span class="fs-text-white fl-node-panel-status-span-4">{label}</span>
			<span class="fl-node-panel-status-span-5">
				Last activity {relative(lastLog?.time ?? null)} · {incoming} in ·
				{outgoing} out
			</span>
		</div>
	</div>
	<div class="fs-grid fs-gap-sm fl-node-panel-status-div-3">
		{#each metrics as metric (metric.label)}
			<div
				class="fs-box fs-gap-xs fs-py-md fl-node-panel-status-div-4"
			>
				<span class="fl-node-panel-status-span-6">{metric.label}</span>
				<span class="fs-text-white fl-node-panel-status-span-7"
					>{metric.value}</span
				>
			</div>
		{/each}
	</div>
	{#if node.kind === 'branch'}
		<div class="fs-box fs-gap-sm">
			<span class="fl-node-panel-status-span-8">Path split</span>
			<div class="fs-row fs-radius-full fl-node-panel-status-div-6">
				<span class="fs-hfull fl-node-panel-status-span-9" style="--split: {`${truthy}%`}"></span>
			</div>
			<div class="fs-row fs-xbetween fl-node-panel-status-div-7">
				<span class="fl-node-panel-status-span-10">TRUE · {truthy}%</span>
				<span class="fl-node-panel-status-span-11">FALSE · {100 - truthy}%</span>
			</div>
		</div>
	{/if}
	{#if !base}
		<span class="fl-node-panel-status-span-12">
			This automation hasn’t run yet. Use Run once to send a test run through it.
		</span>
	{/if}
</div>
