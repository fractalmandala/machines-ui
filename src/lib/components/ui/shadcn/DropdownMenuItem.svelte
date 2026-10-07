<script module lang="ts">
	import './DropdownMenuItem.css';
	import type { DropdownItemProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { cn } from '$lib/utils/utils.js';

	const item =
		'fl-dropdown-menu-item-item';
</script>

<script lang="ts">
	import { Item } from './dropdown-menu/index.js';
	
	import type { Snippet } from 'svelte';

	let {
		className,
		children,
		variant = 'default',
		...props
	}: Omit<DropdownItemProps, 'children'> & {
		className?: string;
		variant?: 'default' | 'destructive';
		children?: Snippet;
	} = $props();
</script>

<Item
	data-slot="dropdown-menu-item"
	data-variant={variant}
	class={cn(
		item,
		'fl-dropdown-menu-item',
		className
	)}
	{...props}
>
	{@render children?.()}
</Item>
