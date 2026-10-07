<script lang="ts">
	import './TooltipContent.css';
	import { Content, Portal } from './tooltip/index.js';
	import { cn } from '$lib/utils/utils.js';
	import type { TooltipContentProps } from './tooltip/tooltip-state.svelte.js';
	import type { Snippet } from 'svelte';

	let {
		className,
		sideOffset = 8,
		children,
		...props
	}: { className?: string; sideOffset?: number; children?: Snippet } & Omit<
		TooltipContentProps,
		'class' | 'children' | 'sideOffset'
	> = $props();
</script>

<Portal>
	<Content
		data-slot="tooltip-content"
		{sideOffset}
		class={cn(
			'fl-tooltip-content',
			className
		)}
		{...props}
	>
		{@render children?.()}
	</Content>
</Portal>
