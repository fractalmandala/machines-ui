<script lang="ts">
	import { useDialog } from './dialog-state.svelte.js';
	import { mergeClass } from '$lib/utils/class.js';
	import type { DialogCloseChildProps, DialogCloseProps } from './types.js';

	let {
		class: className,
		child,
		children,
		ref = $bindable(null),
		...rest
	}: DialogCloseProps = $props();

	const dialog = useDialog();

	function onclick() {
		dialog.setOpen(false);
	}

	let childProps: DialogCloseChildProps = $derived({
		type: 'button',
		'data-state': dialog.open ? 'open' : 'closed',
		'data-dialog-close': '',
		class: mergeClass(className),
		onclick,
		...rest
	} as DialogCloseChildProps);
</script>

{#if child}
	{@render child({ props: childProps })}
{:else}
	<button bind:this={ref} {...childProps}>{@render children?.()}</button>
{/if}
