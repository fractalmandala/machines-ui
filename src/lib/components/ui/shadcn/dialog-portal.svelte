<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	/**
	 * Minimal body portal: Svelte 5 has no built-in portal, so on mount we move
	 * this wrapper (display: contents) into document.body and remove it on
	 * destroy. Children keep being managed by Svelte; only their DOM parent moves.
	 */
	let { children }: { children?: Snippet; [key: string]: unknown } = $props();

	let host = $state<HTMLDivElement | null>(null);

	onMount(() => {
		const node = host;
		if (!node) return;
		document.body.appendChild(node);
		return () => {
			node.remove();
		};
	});
</script>

<div bind:this={host} style="display: contents;">
	{@render children?.()}
</div>
