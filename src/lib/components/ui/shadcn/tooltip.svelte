<script lang="ts">
	import { Root } from './tooltip/index.js';
	import type { TooltipRootProps } from './tooltip/tooltip-state.svelte.js';
	import type { Snippet } from 'svelte';

	let { children, ...props }: { children?: Snippet } & TooltipRootProps = $props();
</script>

<Root {...{ 'data-slot': 'tooltip', ...props }}>
	{@render children?.()}
</Root>
