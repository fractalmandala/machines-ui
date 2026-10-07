<script lang="ts">
	import {
		DropdownMenuState,
		provideDropdownRoot,
		type DropdownRootProps
	} from './dropdown-menu-state.svelte.js';
	import { untrack } from 'svelte';

	let {
		open = $bindable(false),
		defaultOpen = false,
		onOpenChange,
		children
	}: DropdownRootProps = $props();

	const menu = provideDropdownRoot(new DropdownMenuState());

	$effect.pre(() => {
		if (defaultOpen && !open) open = true;
	});

	// push external `open` changes into state; state changes flow back out.
	// state -> prop FIRST (flush order): the local write lands before the
	// prop-driven effect reads it, so an internal toggle can't be reset by a
	// stale controlled prop in the same flush.
	$effect(() => {
		if (open !== menu.open) open = menu.open;
	});

	$effect(() => {
		const openValue = open;
		untrack(() => {
			if (openValue !== menu.open) menu.setOpen(openValue, 'trigger');
		});
	});

	$effect(() => {
		menu.onOpenChange = onOpenChange;
	});
</script>

{@render children?.()}
