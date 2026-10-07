<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import { useDropdownMenu, type DropdownLabelProps } from './dropdown-menu-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		children,
		...rest
	}: DropdownLabelProps = $props();

	const menu = useDropdownMenu();
	void menu;
</script>

{#if child}
	{@render child({ props: { ...rest, class: mergeClass(className) } })}
{:else}
	<span bind:this={ref} class={mergeClass(className)} data-slot="dropdown-menu-label" {...rest}>
		{@render children?.()}
	</span>
{/if}
