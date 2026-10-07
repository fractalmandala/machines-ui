<script lang="ts">
	import { DialogState, provideDialog } from './dialog-state.svelte.js';
	import type { DialogRootProps } from './types.js';

	let { open = $bindable(false), onOpenChange, children }: DialogRootProps = $props();

	const dialog = provideDialog(new DialogState());

	$effect(() => {
		dialog.open = open;
	});

	$effect(() => {
		if (open !== dialog.open) open = dialog.open;
	});

	$effect(() => {
		dialog.onOpenChange = onOpenChange;
	});
</script>

{@render children?.()}
