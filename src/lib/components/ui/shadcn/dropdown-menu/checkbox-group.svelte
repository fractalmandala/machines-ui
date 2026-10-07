<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		DropdownGroupState,
		provideGroup,
		useDropdownMenu,
		type DropdownCheckboxGroupProps
	} from './dropdown-menu-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		value = [],
		onValueChange,
		children,
		...rest
	}: DropdownCheckboxGroupProps = $props();

	const menu = useDropdownMenu();
	void menu;

	const group = provideGroup<string[]>(new DropdownGroupState<string[]>());

	$effect(() => {
		group.value = value;
		group.onValueChange = onValueChange;
	});

	$effect(() => {
		group.onValueChange = onValueChange;
	});
</script>

{#if child}
	{@render child({ props: { ...rest, role: 'group', class: mergeClass(className) } })}
{:else}
	<div bind:this={ref} role="group" class={mergeClass(className)} {...rest}>
		{@render children?.()}
	</div>
{/if}
