<script module lang="ts">
	import './flow-ghost.css';
	import { clsx } from 'clsx';
	import type { ActionKind } from '$lib/stores/flow-store.svelte';
	import DragIcon from '$lib/icons/flow/drag.svelte';
	import { ACTIONS } from './flow-actions.js';

	type FlowGhostProps = {
		kind: ActionKind;
		x: number;
		y: number;
		snapped: boolean;
	};
</script>

<script lang="ts">
	let { kind, x, y, snapped }: FlowGhostProps = $props();

	let { Icon, label, theme } = $derived(ACTIONS[kind]);
</script>

<div
	aria-hidden="true"
	style="--ghost-x: {`${x}px`}; --ghost-y: {`${y}px`}"
	class="fs-fixed fl-flow-ghost"
>
	<div
		data-snapped={snapped || undefined}
		class={clsx(
			theme,
			'fs-row fs-ycenter fs-px-xs fl-flow-ghost-div'
		)}
	>
		<span class="fs-row fs-shrink-0 fs-ycenter fs-pl-xs">
			<Icon aria-hidden className="fl-flow-ghost-icon" />
		</span>
		<span
			class="fs-row fs-minw0 fs-grow fs-ycenter fs-pr-bs fs-pl-sm fs-weight-500 fs-text-white fl-flow-ghost-span-2"
		>
			{label}
		</span>
		<span class="fs-row fs-ycenter fs-xright fl-flow-ghost-span-3">
			<DragIcon aria-hidden class="fl-flow-ghost-drag-icon" />
		</span>
	</div>
</div>
