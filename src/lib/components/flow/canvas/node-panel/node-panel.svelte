<script module lang="ts">
	import './node-panel.css';
	import Button from '$lib/components/ui/button.svelte';
	import Divider from '$lib/components/ui/divider.svelte';
	import SegmentedTabs from '$lib/components/ui/segmented-tabs.svelte';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte';
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte';
	import DropdownMenuItem from '$lib/components/ui/shadcn/DropdownMenuItem.svelte';
	import DropdownMenuLabel from '$lib/components/ui/shadcn/DropdownMenuLabel.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte';
	import type { ActionKind, InspectorTab } from '$lib/stores/flow-store.svelte';
	import CloseIcon from '$lib/icons/flow/zoom-in.svelte';
	import RowInsertIcon from '$lib/icons/flow/row-insert.svelte';
	import { ACTIONS, ACTION_GROUPS } from '../flow-actions.js';
	import NodePanelBuild from './node-panel-build.svelte';
	import NodePanelStatus from './node-panel-status.svelte';
	import NodePanelLogs from './node-panel-logs.svelte';

	const TABS = [
		{
			value: 'build',
			label: 'Build'
		},
		{
			value: 'status',
			label: 'Status'
		},
		{
			value: 'logs',
			label: 'Logs'
		}
	] as const;

	type NodePanelProps = {
		onFocusNode: (id: string) => void;
		onAppend: (sourceId: string, kind: ActionKind) => void;
	};
</script>

<script lang="ts">
	import {
		flow,
		setInspectorTab as setTab,
		openInspector,
		closeInspector
	} from '$lib/stores/flow-store.svelte';

	let { onFocusNode, onAppend }: NodePanelProps = $props();

	const inspector = $derived(flow.inspector);

	const node = $derived(flow.nodes.find((item) => item.id === flow.inspector?.nodeId));

	const next = $derived(flow.edges.find((edge) => edge.source === flow.inspector?.nodeId));

	const goNext = () => {
		if (!next) return;
		openInspector(next.target);
		onFocusNode(next.target);
	};
</script>

<aside
	aria-label={node ? `${ACTIONS[node.kind].label} settings` : 'Step settings'}
	data-empty={!node || undefined}
	onpointerdown={(event) => event.stopPropagation()}
	data-canvas-overlay
	class="fs-box fl-node-panel"
>
	{#if inspector && node}
		<div class="fs-row fs-shrink-0 fs-ycenter fs-xbetween fs-gap-md fl-node-panel-div">
			<SegmentedTabs
				label="Step panels"
				items={TABS}
				value={inspector.tab}
				onChange={(tab: InspectorTab) => setTab(tab)}
			/>
			<!-- docked, the panel is always there; only the overlay on small screens needs a way out -->
			<Button
				variant="ghost"
				size="icon"
				className="fl-node-panel-close"
				aria-label="Close step panel"
				onClick={closeInspector}
			>
				<CloseIcon aria-hidden class="fl-node-panel-close-icon" />
			</Button>
		</div>
		<div class="fs-minh0 fs-grow fs-box fl-node-panel-div-2">
			<Divider />
			<div class="fs-minh0 fl-node-panel-div-3">
				{#if inspector.tab === 'build'}
					<NodePanelBuild {node} />
				{/if}
				{#if inspector.tab === 'status'}
					<NodePanelStatus {node} />
				{/if}
				{#if inspector.tab === 'logs'}
					<NodePanelLogs {node} />
				{/if}
			</div>
			<Divider />
			<div class="fs-shrink-0 fs-py-bs fl-node-panel-div-4">
				{#if next}
					<Button variant="accent" size="block" onClick={goNext}>
						<RowInsertIcon aria-hidden class="fl-node-panel-row-insert-icon" />
						<span class="fs-weight-600">Next step</span>
					</Button>
				{:else}
					<DropdownMenu>
						<DropdownMenuTrigger>
							{#snippet child({ props })}
								<Button {...props} variant="accent" size="block">
									<RowInsertIcon aria-hidden class="fl-node-panel-row-insert-icon-2" />
									<span class="fs-weight-600">Add next step</span>
								</Button>
							{/snippet}
						</DropdownMenuTrigger>
						<DropdownMenuContent side="top" align="center">
							{#each ACTION_GROUPS as group (group.label)}
								<div>
									<DropdownMenuLabel className="fs-tt-u">{group.label}</DropdownMenuLabel>
									{#each group.kinds as kind (kind)}
										{@const option = ACTIONS[kind]}
										<DropdownMenuItem
											className={option.theme}
											onSelect={() => onAppend(node.id, kind)}
										>
											<option.Icon aria-hidden className="fl-node-panel-option-icon" />
											{option.label}
										</DropdownMenuItem>
									{/each}
								</div>
							{/each}
						</DropdownMenuContent>
					</DropdownMenu>
				{/if}
			</div>
		</div>
		<div class="fs-absolute fl-node-panel-div-5"></div>
	{:else}
		<div class="fs-box fs-ycenter fs-xcenter fs-grow fs-pad-xl fl-node-panel-empty">
			<p>Select a step to edit it.</p>
		</div>
	{/if}
</aside>
