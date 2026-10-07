<script lang="ts">
	import './Group.css';
	import type { Snippet } from 'svelte';

	let { title, children }: { title: string; children: Snippet } = $props();
</script>

<div role="group" aria-label={title} class="fs-box fl-group">
	<span class="fs-tt-u fl-group-span">{title}</span>
	<div class="fs-row fs-wrap fs-gap-sm">{@render children?.()}</div>
</div>
