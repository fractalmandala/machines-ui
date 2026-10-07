<script lang="ts">
	import { Root } from './collapsible/index.js';
	import type { CollapsibleRootProps } from './collapsible/collapsible-state.svelte.js';
	import type { Snippet } from 'svelte';

	let {
		className,
		children,
		...props
	}: Omit<CollapsibleRootProps, 'children' | 'class'> & { className?: string; children?: Snippet } =
		$props();
</script>

<Root data-slot="collapsible" class={className} {...props}>
	{@render children?.()}
</Root>
