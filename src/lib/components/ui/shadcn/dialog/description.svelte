<script lang="ts">
	import { dialogId, useDialog } from './dialog-state.svelte.js';
	import { mergeClass } from '$lib/utils/class.js';
	import type { DialogDescriptionProps } from './types.js';

	let {
		class: className,
		children,
		ref = $bindable(null),
		id = dialogId('dialog-description'),
		...rest
	}: DialogDescriptionProps = $props();

	const dialog = useDialog();

	let el = $state<HTMLElement | null>(null);

	$effect(() => {
		dialog.descriptionId = el ? id : undefined;
		return () => {
			if (dialog.descriptionId === id) dialog.descriptionId = undefined;
		};
	});

	$effect(() => {
		ref = el;
	});
</script>

<div bind:this={el} {id} class={mergeClass(className)} {...rest}>{@render children?.()}</div>
