<script module lang="ts">
	import './actions-panel-item.css';
	import { clsx } from 'clsx';
	import type { ActionKind } from '$lib/stores/flow-store.svelte';
	import DragIcon from '$lib/icons/flow/drag.svelte';
	import { ACTIONS } from '../flow-actions.js';

	type ActionsPanelItemProps = {
		kind: ActionKind;
		dragging: boolean;
		onPointerDown: (kind: ActionKind, event: PointerEvent) => void;
		onAdd: (kind: ActionKind) => void;
	};
</script>

<script lang="ts">
	let { kind, dragging, onPointerDown, onAdd }: ActionsPanelItemProps = $props();

	let { Icon, label, theme } = $derived(ACTIONS[kind]);

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		onAdd(kind);
	};
</script>

<li
	role="option"
	tabindex={0}
	aria-selected="false"
	aria-label={`Add ${label}`}
	data-dragging={dragging || undefined}
	onpointerdown={(event) => onPointerDown(kind, event)}
	onkeydown={handleKeyDown}
	class={clsx(
		theme,
		'fs-relative fs-row fs-wfull fs-ycenter fs-px-xs fl-actions-panel-item-group-item fl-actions-panel-item'
	)}
>
	<span class="fs-row fs-shrink-0 fs-ycenter fs-pl-xs">
		<Icon aria-hidden class="fl-actions-panel-item-icon" />
	</span>
	<span
		class="fs-row fs-minw0 fs-grow fs-ycenter fs-pr-bs fs-pl-sm fs-weight-500 fs-text-white fl-actions-panel-item-span-2"
	>
		{label}
	</span>
	<span
		class="fs-row fs-ycenter fs-xright fl-actions-panel-item-span-3"
	>
		<DragIcon aria-hidden class="fl-actions-panel-item-drag-icon" />
	</span>
</li>
