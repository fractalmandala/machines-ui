<script module lang="ts">
	import './node-panel-logs.css';
	import '$lib/styles/palette.css';
	import Button from '$lib/components/ui/button.svelte';
	import { cn } from '$lib/utils/utils.js';
	import type { FlowNodeData } from '$lib/stores/flow-store.svelte';
	import PlayIcon from '$lib/icons/topbar/play.svelte';
	import { startRun } from '../flow-run.js';

	type NodePanelLogsProps = {
		node: FlowNodeData;
	};

	const LEVEL_DOT = {
		info: 'fl-node-panel-logs-level-dot',
		success: 'fl-node-panel-logs-level-dot-2',
		warning: 'fl-node-panel-logs-level-dot-3'
	};

	const timeFormat = new Intl.DateTimeFormat('en-GB', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit'
	});
</script>

<script lang="ts">
	import { flow } from '$lib/stores/flow-store.svelte';

	let { node }: NodePanelLogsProps = $props();

	let scope = $state<'step' | 'all'>('step');

	const logs = $derived(flow.logs);

	const running = $derived(flow.run.status === 'running');

	let visible = $derived(
		[...logs].reverse().filter((log) => scope === 'all' || log.nodeId === node.id)
	);
</script>

<div class="fs-box fs-gap-md">
	<div class="fs-row fs-ycenter fs-xbetween">
		<div
			class="fs-row fs-gap-xs fl-node-panel-logs-div-2"
		>
			{#each ['step', 'all'] as const as value (value)}
				<Button
					variant="ghost"
					size="xs"
					aria-pressed={scope === value}
					onClick={() => (scope = value)}
					className="fl-node-panel-logs-button"
				>
					{value === 'step' ? 'This step' : 'All steps'}
				</Button>
			{/each}
		</div>
		<span class="fl-node-panel-logs-span">
			{visible.length}
			{visible.length === 1 ? 'entry' : 'entries'}
		</span>
	</div>
	{#if visible.length}
		<ol
			class="fs-box fl-node-panel-logs-ol"
		>
			{#each visible as log (log.id)}
				<li
					class="fs-row fs-ytop fs-gap-md fl-node-panel-logs-li"
				>
					<span class={cn('fs-shrink-0 fs-radius-full fl-node-panel-logs-span-2', LEVEL_DOT[log.level])}></span>
					<span class="fs-minw0 fs-grow fl-node-panel-logs-span-3">{log.message}</span>
					<span class="fs-shrink-0 fl-node-panel-logs-span-4">
						#{log.run} · {timeFormat.format(log.time)}
					</span>
				</li>
			{/each}
		</ol>
	{:else}
		<div
			class="fs-box fs-px-lg fs-ta-c fl-node-panel-logs-div-3"
		>
			<span class="fs-text-white fl-node-panel-logs-span-5">No logs yet</span>
			<span class="fl-node-panel-logs-span-6">
				Send a test run through the flow to see what each step does.
			</span>
			<Button
				variant="accent"
				size="field"
				className="fl-node-panel-logs-button-2"
				disabled={running}
				onClick={() => startRun()}
			>
				<PlayIcon aria-hidden class="fl-node-panel-logs-play-icon" />
				<span class="fs-pr-xs">{running ? 'Running…' : 'Run once'}</span>
			</Button>
		</div>
	{/if}
</div>
