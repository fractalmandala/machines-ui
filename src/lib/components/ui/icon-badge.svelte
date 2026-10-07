<script module lang="ts">
	import './icon-badge.css';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/utils.js';

	type IconBadgeProps = {
		children: Snippet;
		className?: string;
	};
</script>

<script lang="ts">
	let { children, className }: IconBadgeProps = $props();
</script>

<span
	aria-hidden="true"
	class={cn(
		'fl-icon-badge',
		className
	)}
>
	{@render children?.()}
</span>
