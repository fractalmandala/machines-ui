<script module lang="ts">
	import './DropdownMenuSubTrigger.css';
	import type { DropdownSubTriggerProps } from '$lib/components/ui/shadcn/dropdown-menu/dropdown-menu-state.svelte.js';
import { cn } from '$lib/utils/utils.js';
	import ChevronRightIcon from '$lib/svg/flow/chevron-right.svg';

	const item =
		'fl-dropdown-menu-sub-trigger-item';
</script>

<script lang="ts">
	import { SubTrigger } from '$lib/components/ui/shadcn/dropdown-menu/index.js';
	
	import type { Snippet } from 'svelte';

	let {
		className,
		children,
		...props
	}: Omit<DropdownSubTriggerProps, 'children'> & { className?: string; children?: Snippet } =
		$props();
</script>

<SubTrigger
	data-slot="dropdown-menu-sub-trigger"
	class={cn(item, 'fl-dropdown-menu-sub-trigger', className)}
	{...props}
>
	{@render children?.()}
	<ChevronRightIcon aria-hidden class="fl-dropdown-menu-sub-trigger-chevron-right-icon" />
</SubTrigger>
