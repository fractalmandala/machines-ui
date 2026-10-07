<script lang="ts">
	import { dialogId, useDialog } from './dialog-state.svelte.js';
	import { mergeClass } from '$lib/utils/class.js';
	import type { DialogTitleProps } from './types.js';

	let {
		class: className,
		children,
		ref = $bindable(null),
		id = dialogId('dialog-title'),
		...rest
	}: DialogTitleProps = $props();

	const dialog = useDialog();

	let el = $state<HTMLElement | null>(null);

	$effect(() => {
		dialog.titleId = el ? id : undefined;
		return () => {
			if (dialog.titleId === id) dialog.titleId = undefined;
		};
	});

	$effect(() => {
		ref = el;
	});
</script>

<div bind:this={el} {id} class={mergeClass(className)} {...rest}>{@render children?.()}</div>
