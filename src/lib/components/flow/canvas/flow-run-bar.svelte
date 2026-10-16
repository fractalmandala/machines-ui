<script module lang="ts">
	import './flow-run-bar.css';
	import Button from '$lib/components/ui/button.svelte';
	import { Input } from '$lib/components/ui/field.js';
	import PlayIcon from '$lib/icons/topbar/play.svelte';
	import { approveStep, isRunning, rejectStep, startRun, stopRun } from './flow-run.js';
</script>

<script lang="ts">
	import { flow } from '$lib/stores/flow-store.svelte';

	let open = $state(false);
	let notes = $state<Record<string, string>>({});

	const run = $derived(flow.run);
	const running = $derived(isRunning());
	const trigger = $derived(flow.nodes.find((n) => n.kind === 'trigger'));
	const sample = $derived(trigger?.rules?.sampleOutput ?? '');
	const invalid = $derived.by(() => {
		if (!flow.payload.trim()) return false;

		try {
			JSON.parse(flow.payload);

			return false;
		} catch {
			return true;
		}
	});

	const titleOf = (id: string) => flow.nodes.find((n) => n.id === id)?.title ?? id;

	const message = $derived(
		run.status === 'running'
			? 'Running…'
			: run.status === 'paused'
				? 'Paused: waiting for a person'
				: run.status === 'done'
					? run.simulated
						? 'Done · simulated run'
						: 'Done'
					: run.status === 'failed'
						? (run.error ?? 'Failed')
						: run.status === 'stopped'
							? 'Stopped'
							: ''
	);
</script>

<div class="fl-flow-run-bar fs-box fs-gap-sm" data-canvas-overlay role="toolbar" aria-label="Run" tabindex="0" onpointerdown={(event) => event.stopPropagation()}>
	<div class="fs-row fs-ycenter fs-gap-sm fl-flow-run-bar-row">
		{#if running}
			<Button variant="field" size="field" className="fs-px-md" onClick={stopRun}>Stop</Button>
		{:else}
			<Button variant="accent" size="field" className="fs-px-md" disabled={invalid} onClick={() => startRun()}>
				<PlayIcon aria-hidden class="fl-flow-run-bar-icon" />
				<span class="fs-pr-xs">Run</span>
			</Button>
		{/if}
		<Button variant="ghost" size="field" aria-expanded={open} aria-controls="run-payload" className="fs-px-sm" onClick={() => (open = !open)}>Payload</Button>
		{#if message}<span class="fl-flow-run-bar-status" data-status={run.status} role="status">{message}</span>{/if}
	</div>

	{#if open}
		<div id="run-payload" class="fs-box fs-gap-sm fl-flow-run-bar-panel">
			<label class="fl-flow-run-bar-label" for="run-payload-text">What the trigger starts the run with, as JSON</label>
			<textarea
				id="run-payload-text"
				rows="5"
				spellcheck="false"
				class="fl-flow-run-bar-text"
				aria-invalid={invalid}
				placeholder={sample || '{ }'}
				bind:value={flow.payload}
			></textarea>
			<div class="fs-row fs-ycenter fs-xbetween">
				<span class="fl-flow-run-bar-hint" data-invalid={invalid || undefined}>{invalid ? 'Not valid JSON yet.' : flow.payload.trim() ? 'Used for the next run.' : 'Empty: the trigger’s sample output is used.'}</span>
				{#if flow.payload}<Button variant="ghost" size="xs" onClick={() => (flow.payload = '')}>Use the sample</Button>{/if}
			</div>
		</div>
	{/if}

	{#each run.waiting as id (id)}
		<div class="fs-box fs-gap-sm fl-flow-run-bar-panel fl-flow-run-bar-approve" role="group" aria-label="Waiting for a person">
			<span class="fl-flow-run-bar-label"><strong>{titleOf(id)}</strong> is waiting for a person.</span>
			<Input aria-label="Note or reason" placeholder="Note or reason (optional)" value={notes[id] ?? ''} onChange={(event) => (notes[id] = event.target.value)} />
			<div class="fs-row fs-gap-sm">
				<Button variant="accent" size="field" className="fs-px-md" onClick={() => { approveStep(id, notes[id] || undefined); notes[id] = ''; }}>Approve</Button>
				<Button variant="field" size="field" className="fs-px-md" onClick={() => { rejectStep(id, notes[id] || undefined); notes[id] = ''; }}>Reject</Button>
			</div>
		</div>
	{/each}
</div>
