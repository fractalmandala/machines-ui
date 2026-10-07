<script module lang="ts">
	import './actions-panel.css';
	import Button from '$lib/components/ui/button.svelte';
	import type { ActionKind } from '$lib/stores/flow-store.svelte';
	import ExpandIcon from '$lib/icons/flow/expand.svelte';
	import LayoutIcon from '$lib/icons/flow/layout.svelte';
	import ChevronRightIcon from '$lib/icons/flow/chevron-right.svelte';
	import { ACTION_GROUPS } from '../flow-actions.js';
	import ActionsPanelItem from './actions-panel-item.svelte';

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
					{#each ACTION_GROUPS as group (group.label)}
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
			<div class="fs-row fs-shrink-0 fs-ycenter fs-xbetween fl-actions-panel-div-8">
				<span class="fs-row fs-ycenter fs-gap-sm">
					<LayoutIcon aria-hidden class="fl-actions-panel-layout-icon" />
					<span
						class="fs-text-white fl-actions-panel-span-4"
					>
						Template
					</span>
				</span>
				<Button variant="ghost" size="icon" aria-label="Browse templates">
					<ChevronRightIcon
						aria-hidden
						class="fl-actions-panel-chevron-right-icon"
					/>
				</Button>
			</div>
		</div>
	</div>
	<div
		class="fs-absolute fl-actions-panel-div-9"
	></div>
</aside>
