<script lang="ts">
	import './DropdownMenuSeparator.css';
	import type { DropdownSeparatorProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { Separator } from './dropdown-menu/index.js';
	import { cn } from '$lib/utils/utils.js';
	

	let { className, ...props }: Omit<DropdownSeparatorProps, 'class'> & {
		className?: string;
	} = $props();
</script>

<Separator
	data-slot="dropdown-menu-separator"
	class={cn(
		'fl-dropdown-menu-separator',
		className
	)}
	{...props}
/>
