<script module lang="ts">
	import './node-panel-build.css';
	import { Field, Input, Textarea, fieldSurface } from '$lib/components/ui/field.js';
	import { deriveNode } from './node-panel-rules.svelte';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte';
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte';
	import DropdownMenuItem from '$lib/components/ui/shadcn/DropdownMenuItem.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte';
	import { cn } from '$lib/utils/utils.js';
	import type { ActionKind, FlowNodeData } from '$lib/stores/flow-store.svelte';
	import ChevronIcon from '$lib/icons/flow/chevron-right.svelte';
	import { ACTIONS } from '../flow-actions.js';
	import NodePanelRules from './node-panel-rules.svelte';
	import NodePanelLook from './node-panel-look.svelte';
	import NodePanelPorts from './node-panel-ports.svelte';

	type NodePanelBuildProps = {
		node: FlowNodeData;
	};

	const KINDS = Object.keys(ACTIONS) as ActionKind[];
</script>

<script lang="ts">
	import { updateNode, checkpoint, changeKind } from '$lib/stores/flow-store.svelte';

	let { node }: NodePanelBuildProps = $props();

	let action = $derived(ACTIONS[node.kind]);

	let { Icon } = $derived(action);

	const changeRules = (rules: Record<string, string>) => {
		updateNode(node.id, {
			rules,
			...deriveNode(node, rules)
		});
	};
</script>

<div class="fs-box fs-gap-bs">
	<span
		class="fs-text-white fl-node-panel-build-span"
	>
		Details
	</span>
	<div class="fs-box fs-gap-bs">
		<Field label="Type">
			<DropdownMenu>
				<DropdownMenuTrigger
					className={cn(
						fieldSurface,
						'fs-row fs-wfull fs-ycenter fs-px-xs fs-ta-l fl-node-panel-build-group fl-node-panel-build-dropdown-menu-trigge',
						action.theme
					)}
				>
					<span class="fs-row fs-shrink-0 fs-ycenter fs-pl-xs">
						<Icon aria-hidden className="fl-node-panel-build-icon" />
					</span>
					<span class="fs-minw0 fs-grow fs-truncate fs-pr-bs fs-pl-sm">{action.label}</span>
					<ChevronIcon
						aria-hidden
						class="fs-mr-sm fl-node-panel-build-chevron-icon"
					/>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{#each KINDS as kind (kind)}
						{@const option = ACTIONS[kind]}
						<DropdownMenuItem
							className={option.theme}
							onSelect={() =>
								changeKind(node.id, kind, { title: option.title, description: option.description })}
						>
							<option.Icon aria-hidden className="fl-node-panel-build-option-icon" />
							{option.label}
							{#if kind === node.kind}
								<span class="fs-radius-full fl-node-panel-build-span-4"></span>
							{/if}
						</DropdownMenuItem>
					{/each}
				</DropdownMenuContent>
			</DropdownMenu>
		</Field>
		<Field label="Name" htmlFor={`${node.id}-name`}>
			<Input
				id={`${node.id}-name`}
				value={node.title}
				onFocus={checkpoint}
				onChange={(event) => updateNode(node.id, { title: event.target.value })}
			/>
		</Field>
		<Field label="Description" htmlFor={`${node.id}-description`}>
			<Textarea
				id={`${node.id}-description`}
				placeholder="Describe your actions"
				value={node.description}
				onFocus={checkpoint}
				onChange={(event) => updateNode(node.id, { description: event.target.value })}
			/>
		</Field>
		<!-- always open: a heading, then its fields -->
		<div class="fs-box fs-gap-xs">
			<span class="fl-node-panel-build-section">Rules</span>
			<div class="fs-pt-sm fs-pb-xs" onfocuscapture={checkpoint}>
				<NodePanelRules {node} onChange={changeRules} />
			</div>
		</div>
		<div class="fs-box fs-gap-xs">
			<span class="fl-node-panel-build-section">Look</span>
			<div class="fs-pt-sm fs-pb-xs"><NodePanelLook {node} /></div>
		</div>
		<div class="fs-box fs-gap-xs">
			<span class="fl-node-panel-build-section">Ports</span>
			<div class="fs-pt-sm fs-pb-xs"><NodePanelPorts {node} /></div>
		</div>
	</div>
</div>
