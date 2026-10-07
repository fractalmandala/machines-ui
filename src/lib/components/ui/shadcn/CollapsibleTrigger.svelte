<script lang="ts">
	import { Trigger } from './collapsible/index.js';
	import type { Snippet } from 'svelte';

	let {
		child,
		className,
		...props
	}: { child?: Snippet; className?: string; [key: string]: unknown } = $props();
</script>

<Trigger data-slot="collapsible-trigger" {child} class={className} {...props} />
