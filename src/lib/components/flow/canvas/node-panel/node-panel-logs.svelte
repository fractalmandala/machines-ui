<script module lang="ts">
	import './node-panel-logs.css';
	import '$lib/styles/palette.css';
	import Button from '$lib/components/ui/button.svelte';
	import { Input } from '$lib/components/ui/field.js';
	import SelectField from '$lib/components/ui/select-field.svelte';
	import { cn } from '$lib/utils/utils.js';
	import type { FlowNodeData } from '$lib/stores/flow-store.svelte';
	import type { Level } from '$lib/engine/index.js';
	import PlayIcon from '$lib/icons/topbar/play.svelte';
	import { isRunning, resumeRun, startRun, viewRun } from '../flow-run.js';

	type NodePanelLogsProps = {
		node: FlowNodeData;
	};

	const LEVEL_DOT: Record<Level, string> = {
		debug: 'fl-node-panel-logs-level-dot-5',
		info: 'fl-node-panel-logs-level-dot',
		success: 'fl-node-panel-logs-level-dot-2',
		warning: 'fl-node-panel-logs-level-dot-3',
		error: 'fl-node-panel-logs-level-dot-4'
	};

	const LEVELS = ['All levels', 'Info and above', 'Warnings and errors', 'Errors only'] as const;
	const RANK: Record<Level, number> = { debug: 0, info: 1, success: 1, warning: 2, error: 3 };
	const MIN: Record<(typeof LEVELS)[number], number> = { 'All levels': 0, 'Info and above': 1, 'Warnings and errors': 2, 'Errors only': 3 };

	const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

	const offset = (ms: number) => (ms < 1000 ? `+${Math.round(ms)}ms` : `+${(ms / 1000).toFixed(1)}s`);

	const show = (data: unknown) => (typeof data === 'string' ? data : JSON.stringify(data, null, 2));
</script>

<script lang="ts">
	import { flow } from '$lib/stores/flow-store.svelte';

	let { node }: NodePanelLogsProps = $props();

	let scope = $state<'step' | 'all'>('step');
	let level = $state<(typeof LEVELS)[number]>('All levels');
	let query = $state('');
	let follow = $state(true);
	let list = $state<HTMLOListElement | null>(null);

	const running = $derived(isRunning());

	// the run on show: the latest unless one was picked from the history
	const record = $derived(flow.viewedRun ? (flow.viewedRecord ?? flow.record) : flow.record);

	const label = (r: (typeof flow.history)[number]) => `Run #${r.number} · ${clock.format(r.startedAt)} · ${r.status}${r.simulated ? ' · simulated' : ''}`;
	const labels = $derived(flow.history.map(label));
	const picked = $derived(flow.history.find((r) => r.id === (flow.viewedRun ?? record?.id)));

	const titleOf = (id: string | null) => (id ? (flow.nodes.find((n) => n.id === id)?.title ?? id) : 'Run');

	let visible = $derived(
		(record?.logs ?? []).filter((log) => (scope === 'all' || log.nodeId === node.id) && RANK[log.level] >= MIN[level] && (!query.trim() || `${log.message} ${titleOf(log.nodeId)}`.toLowerCase().includes(query.trim().toLowerCase())))
	);

	// follow: keep the newest line in view while a run is writing
	$effect(() => {
		void visible.length;

		if (follow && list) list.scrollTop = list.scrollHeight;
	});
</script>

<div class="fs-box fs-gap-md">
	{#if flow.history.length}
		<SelectField
			value={picked ? label(picked) : labels[0]}
			options={labels}
			onChange={(next) => {
				const chosen = flow.history[labels.indexOf(next)];

				if (chosen) void viewRun(chosen.id === flow.record?.id ? null : chosen.id);
			}}
		/>
	{/if}
	<div class="fs-row fs-ycenter fs-xbetween fs-gap-sm">
		<div class="fs-row fs-gap-xs fl-node-panel-logs-div-2">
			{#each ['step', 'all'] as const as value (value)}
				<Button variant="ghost" size="xs" aria-pressed={scope === value} onClick={() => (scope = value)} className="fl-node-panel-logs-button">
					{value === 'step' ? 'This step' : 'All steps'}
				</Button>
			{/each}
		</div>
		<Button variant="ghost" size="xs" aria-pressed={follow} onClick={() => (follow = !follow)} className="fl-node-panel-logs-button fl-node-panel-logs-follow">Follow</Button>
	</div>
	<div class="fs-row fs-gap-sm">
		<SelectField value={level} options={[...LEVELS]} onChange={(next) => (level = next as (typeof LEVELS)[number])} />
		<Input aria-label="Search the log" placeholder="Search" value={query} onChange={(event) => (query = event.target.value)} className="fs-minw0 fs-grow" />
	</div>
	<span class="fl-node-panel-logs-span">
		{visible.length}
		{visible.length === 1 ? 'entry' : 'entries'}{record?.simulated ? ' · simulated run' : ''}
	</span>
	{#if record?.status === 'paused' && !running}
		<Button variant="field" size="field" onClick={() => void resumeRun(record.id)}>Resume this run</Button>
	{/if}
	{#if visible.length}
		<ol bind:this={list} class="fs-box fl-node-panel-logs-ol fl-node-panel-logs-scroll" aria-label="Run log">
			{#each visible as log, index (index)}
				<li class="fs-row fs-ytop fs-gap-md fl-node-panel-logs-li" data-level={log.level}>
					<span class={cn('fs-shrink-0 fs-radius-full fl-node-panel-logs-span-2', LEVEL_DOT[log.level])}></span>
					<span class="fs-minw0 fs-grow fl-node-panel-logs-span-3">
						{#if scope === 'all' && log.nodeId}<strong class="fl-node-panel-logs-step">{titleOf(log.nodeId)}</strong>{/if}
						{log.message}
						{#if log.data !== undefined}
							<details class="fl-node-panel-logs-data"><summary>data</summary><pre>{show(log.data)}</pre></details>
						{/if}
					</span>
					<span class="fs-shrink-0 fl-node-panel-logs-span-4" title={clock.format(log.t)}>{offset(log.t - (record?.startedAt ?? log.t))}</span>
				</li>
			{/each}
		</ol>
	{:else if record}
		<div class="fs-box fs-px-lg fs-ta-c fl-node-panel-logs-div-3">
			<span class="fs-text-white fl-node-panel-logs-span-5">Nothing matches</span>
			<span class="fl-node-panel-logs-span-6">Try All steps, or clear the search and the level filter.</span>
		</div>
	{:else}
		<div class="fs-box fs-px-lg fs-ta-c fl-node-panel-logs-div-3">
			<span class="fs-text-white fl-node-panel-logs-span-5">No logs yet</span>
			<span class="fl-node-panel-logs-span-6">Run the workflow to see what each step does.</span>
			<Button variant="accent" size="field" className="fl-node-panel-logs-button-2" disabled={running} onClick={() => startRun()}>
				<PlayIcon aria-hidden class="fl-node-panel-logs-play-icon" />
				<span class="fs-pr-xs">{running ? 'Running…' : 'Run'}</span>
			</Button>
		</div>
	{/if}
</div>
