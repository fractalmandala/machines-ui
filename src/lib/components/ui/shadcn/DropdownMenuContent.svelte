<script module lang="ts">
	import './DropdownMenuContent.css';
	const surface =
		'fl-dropdown-menu-content-surface';
</script>

<script lang="ts">
	import type { DropdownContentProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { Content, Portal } from './dropdown-menu/index.js';
	import { cn } from '$lib/utils/utils.js';
	

	let {
		className,
		sideOffset = 6,
		...props
	}: Omit<DropdownContentProps, 'class' | 'sideOffset'> & { className?: string; sideOffset?: number } = $props();
</script>

<Portal>
	<Content
		data-slot="dropdown-menu-content"
		{sideOffset}
		class={cn(surface, 'fl-dropdown-menu-content', className)}
		{...props}
	/>
</Portal>
