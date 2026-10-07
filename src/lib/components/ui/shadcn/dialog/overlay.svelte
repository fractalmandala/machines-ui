<script lang="ts">
	import { useDialog } from './dialog-state.svelte.js';
	import { mergeClass } from '$lib/utils/class.js';
	import type { DialogOverlayProps } from './types.js';

	let {
		class: className,
		ref = $bindable(null),
		style: styleProp,
		...rest
	}: DialogOverlayProps = $props();

	const dialog = useDialog();

	let style = $derived(['pointer-events: auto', styleProp].filter(Boolean).join('; '));
</script>

{#if dialog.open}
	<div
		bind:this={ref}
		class={mergeClass(className)}
		{style}
		data-state={dialog.open ? 'open' : 'closed'}
		data-dialog-overlay=""
		aria-hidden="true"
		onclick={() => dialog.setOpen(false)}
		{...rest}
	></div>
{/if}
