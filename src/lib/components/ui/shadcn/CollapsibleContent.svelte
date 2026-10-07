<script lang="ts">
	import { Content } from './collapsible/index.js';
	import type { Snippet } from 'svelte';

	let {
		child,
		className,
		...props
	}: { child?: Snippet; className?: string; [key: string]: unknown } = $props();
</script>

<Content data-slot="collapsible-content" {child} class={className} {...props} />
