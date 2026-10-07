<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		useDropdownMenu,
		type DropdownGroupProps
	} from './dropdown-menu-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		children,
		...rest
	}: DropdownGroupProps = $props();

	// groups are purely structural today (roving tabindex works across the
	// whole menu); kept for bits-ui parity
	const menu = useDropdownMenu();
</script>

{#if child}
	{@render child({ props: { ...rest, role: 'group', class: mergeClass(className) } })}
{:else}
	<div bind:this={ref} role="group" class={mergeClass(className)} {...rest}>
		{@render children?.()}
	</div>
{/if}
