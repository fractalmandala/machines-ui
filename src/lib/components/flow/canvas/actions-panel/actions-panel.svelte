<script module lang="ts">
	import './actions-panel.css';
	import Button from '$lib/components/ui/button.svelte';
	import type { ActionKind } from '$lib/stores/flow-store.svelte';
	import ExpandIcon from '$lib/icons/flow/expand.svelte';
	import { ACTION_GROUPS } from '../flow-actions.js';
	import ActionsPanelItem from './actions-panel-item.svelte';
	import ExportDialog from '$lib/components/flow/export/export-dialog.svelte';
	import McpConnect from '$lib/components/flow/mcp-connect/mcp-connect.svelte';
	import { SEED_GRAPHS, blankGraph, seedAutomations } from '$lib/data/automations.js';
	import { flow, loadGraph, select, sendCommand } from '$lib/stores/flow-store.svelte';

	// the open list of workflows: a blank one, then the ten samples
	const WORKFLOWS = [{ id: 'blank', name: 'Blank workflow' }, ...seedAutomations(0).map((a) => ({ id: a.id, name: a.name }))];

	function openWorkflow(id: string) {
		loadGraph(id, id === 'blank' ? () => blankGraph('blank') : SEED_GRAPHS[id]);
		select(null);
		sendCommand('fit');
	}

	type ActionsPanelProps = {
		ref?: HTMLElement | null;
		open: boolean;
		draggingKind: ActionKind | null;
		onToggle: () => void;
		onItemPointerDown: (kind: ActionKind, event: PointerEvent) => void;
		onAdd: (kind: ActionKind) => void;
	};

	const divider =
		'fs-shrink-0 fl-actions-panel-divider';
</script>

<script lang="ts">
	let {
		ref = $bindable(),
		open,
		draggingKind,
		onToggle,
		onItemPointerDown,
		onAdd
	}: ActionsPanelProps = $props();
</script>

<aside
	bind:this={ref}
	aria-label="Actions"
	data-canvas-overlay
	onpointerdown={(event) => event.stopPropagation()}
	class="fs-box fl-actions-panel"
>
	<div class="fs-row fs-shrink-0 fs-ycenter fs-xbetween fl-actions-panel-div">
		<span
			class="fs-text-white fl-actions-panel-span"
		>
			Actions
		</span>
		<Button
			variant="ghost"
			size="icon"
			className="fl-actions-panel-toggle"
			aria-expanded={open}
			aria-controls="actions-panel-body"
			aria-label={open ? 'Collapse actions' : 'Expand actions'}
			onClick={onToggle}
		>
			<ExpandIcon
				aria-hidden
				class="fl-actions-panel-expand-icon"
			/>
		</Button>
	</div>
	<div
		id="actions-panel-body"
		data-open={open || undefined}
		inert={!open}
		class="fs-grid fs-minh0 fl-actions-panel-actions-panel-body"
	>
		<div class="fs-minh0 fs-box fl-actions-panel-div-2">
			<div class={divider}></div>
			<div class="fs-minh0 fl-actions-panel-div-4">
				<div class="fs-box fs-gap-bs">
					<section aria-label="Workflows" class="fs-box fl-actions-panel-section">
						<div class="fs-row fs-h-lg fs-ycenter fl-actions-panel-div-6">
							<span class="fs-tt-u fl-actions-panel-span-2">Workflows</span>
						</div>
						<ul class="fs-box fl-actions-panel-ul" role="listbox" aria-label="Workflows">
							{#each WORKFLOWS as item (item.id)}
								<li
									role="option"
									tabindex={0}
									aria-selected={flow.graphId === item.id}
									onclick={() => openWorkflow(item.id)}
									onkeydown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											openWorkflow(item.id);
										}
									}}
									class="fs-relative fs-row fs-wfull fs-ycenter fs-px-xs fl-actions-panel-item-group-item fl-actions-panel-item"
								>
									<span class="fs-row fs-minw0 fs-grow fs-ycenter fs-px-bs fs-weight-500 fs-text-white fl-actions-panel-item-span-2">{item.name}</span>
								</li>
							{/each}
						</ul>
					</section>
					{#each ACTION_GROUPS.filter((group) => group.label !== 'Messages') as group (group.label)}
						<section aria-label={group.label} class="fs-box fl-actions-panel-section">
							<div class="fs-row fs-h-lg fs-ycenter fl-actions-panel-div-6">
								<span class="fs-tt-u fl-actions-panel-span-2"
									>{group.label}</span
								>
							</div>
							<ul class="fs-box fl-actions-panel-ul">
								{#each group.kinds as kind (kind)}
									<ActionsPanelItem
										{kind}
										dragging={draggingKind === kind}
										onPointerDown={onItemPointerDown}
										{onAdd}
									/>
								{/each}
							</ul>
						</section>
					{/each}
				</div>
			</div>
			<div class={divider}></div>
			<div class="fs-row fs-shrink-0 fs-ycenter fs-gap-sm fl-actions-panel-div-8">
				<ExportDialog />
				<McpConnect />
			</div>
		</div>
	</div>
	<div
		class="fs-absolute fl-actions-panel-div-9"
	></div>
</aside>
