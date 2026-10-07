<script lang="ts">
	import {
		DropdownSubState,
		provideDropdownSub,
		useDropdownMenu,
		type DropdownSubProps
	} from './dropdown-menu-state.svelte.js';
	import { untrack } from 'svelte';

	let {
		open = $bindable(false),
		defaultOpen = false,
		onOpenChange,
		children
	}: DropdownSubProps = $props();

	const parent = useDropdownMenu();
	const sub = provideDropdownSub(new DropdownSubState(parent));

	$effect.pre(() => {
		if (defaultOpen && !open) open = true;
	});

	$effect(() => {
		if (open !== sub.open) open = sub.open;
	});

	$effect(() => {
		const openValue = open;
		untrack(() => {
			if (openValue !== sub.open) sub.setOpen(openValue, 'trigger');
		});
	});

	$effect(() => {
		sub.onOpenChange = onOpenChange;
	});
</script>

{@render children?.()}
