<script lang="ts">
	import './divider.css';
	import { cn } from '$lib/utils/utils.js';

	let { className }: { className?: string } = $props();
</script>

<div
	aria-hidden="true"
	class={cn(
		'fl-divider',
		className
	)}
></div>
