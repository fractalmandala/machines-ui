<script module lang="ts">
	import './DropdownMenuSubContent.css';
	const surface =
		'fl-dropdown-menu-sub-content-surface';
</script>

<script lang="ts">
	import type { DropdownSubContentProps } from '$lib/components/ui/shadcn/dropdown-menu/dropdown-menu-state.svelte.js';
import { Portal, SubContent } from '$lib/components/ui/shadcn/dropdown-menu/index.js';
	import { cn } from '$lib/utils/utils.js';
	

	let { className, ...props }: Omit<DropdownSubContentProps, 'class'> & {
		className?: string;
	} = $props();
</script>

<Portal>
	<SubContent
		data-slot="dropdown-menu-sub-content"
		class={cn(surface, 'fl-dropdown-menu-sub-content', className)}
		{...props}
	/>
</Portal>
