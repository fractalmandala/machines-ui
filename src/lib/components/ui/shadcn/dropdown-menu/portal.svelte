<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	let { to = 'body', children }: { to?: string | HTMLElement; children?: Snippet } = $props();

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

<span bind:this={host} style="display: contents;" data-slot="dropdown-menu-portal">
	{@render children?.()}
</span>
