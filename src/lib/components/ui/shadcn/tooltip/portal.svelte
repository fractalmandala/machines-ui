<script lang="ts">
	import { onMount } from 'svelte';
	import type { TooltipPortalProps } from './tooltip-state.svelte.js';

	let { to = 'body', children }: TooltipPortalProps = $props();

	// Hand-rolled portal: Svelte owns the children, we just relocate the host
	// element into the target (document.body by default) after mount.
	let host: HTMLSpanElement | null = null;

	onMount(() => {
		const target = typeof to === 'string' ? document.querySelector(to) : to;
		if (!host || !target) return;
		target.appendChild(host);
		return () => {
			if (host && host.parentElement) host.parentElement.removeChild(host);
		};
	});
</script>

<span bind:this={host} style="display: contents;" data-slot="tooltip-portal">
	{@render children?.()}
</span>
