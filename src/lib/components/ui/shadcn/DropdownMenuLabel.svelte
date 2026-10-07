<script lang="ts">
	import './DropdownMenuLabel.css';
	import type { DropdownLabelProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { GroupHeading } from './dropdown-menu/index.js';
	import { cn } from '$lib/utils/utils.js';
	

	let { className, ...props }: Omit<DropdownLabelProps, 'class'> & {
		className?: string;
	} = $props();
</script>

<GroupHeading
	data-slot="dropdown-menu-label"
	class={cn('fl-dropdown-menu-label', className)}
	{...props}
/>
