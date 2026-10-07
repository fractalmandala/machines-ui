<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		useDropdownMenu,
		type DropdownSeparatorProps
	} from './dropdown-menu-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		...rest
	}: DropdownSeparatorProps = $props();

	const menu = useDropdownMenu();
	void menu;
</script>

{#if child}
	{@render child({ props: { ...rest, role: 'separator', class: mergeClass(className) } })}
{:else}
	<div bind:this={ref} role="separator" class={mergeClass(className)} {...rest}></div>
{/if}
