<script lang="ts">
	import { dialogId, useDialog } from './dialog-state.svelte.js';
	import { mergeClass } from '$lib/utils/class.js';
	import type { DialogTriggerChildProps, DialogTriggerProps } from './types.js';

	let {
		class: className,
		child,
		children,
		ref = $bindable(null),
		id = dialogId('dialog-trigger'),
		...rest
	}: DialogTriggerProps = $props();

	const dialog = useDialog();

	function onclick() {
		dialog.restoreEl = document.activeElement;
		dialog.setOpen(!dialog.open);
	}

	let childProps: DialogTriggerChildProps = $derived({
		id,
		type: 'button',
		'aria-haspopup': 'dialog',
		'aria-expanded': dialog.open,
		'aria-controls': dialog.contentId,
		'data-state': dialog.open ? 'open' : 'closed',
		'data-dialog-trigger': '',
		class: mergeClass(className),
		onclick,
		...rest
	} as DialogTriggerChildProps);
</script>

{#if child}
	{@render child({ props: childProps })}
{:else}
	<button bind:this={ref} {...childProps}>{@render children?.()}</button>
{/if}
