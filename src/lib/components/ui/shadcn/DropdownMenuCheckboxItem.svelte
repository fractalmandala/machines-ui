<script module lang="ts">
	import './DropdownMenuCheckboxItem.css';
	import type { DropdownItemProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { cn } from '$lib/utils/utils.js';

	const item =
		'fl-dropdown-menu-checkbox-item-item';
</script>

<script lang="ts">
	import { CheckboxItem } from './dropdown-menu/index.js';
	
	import type { Snippet } from 'svelte';

	let {
		className,
		children: content,
		checked = $bindable(false),
		onSelect,
		onCheckedChange,
		...props
	}: {
		className?: string;
		children?: Snippet;
		checked?: boolean;
		onSelect?: (event: Event) => void;
		onCheckedChange?: (checked: boolean) => void;
	} & Omit<DropdownItemProps, 'children'> = $props();
</script>

<CheckboxItem
	data-slot="dropdown-menu-checkbox-item"
	bind:checked
	class={cn(item, 'fl-dropdown-menu-checkbox-item', className)}
	{...props}
>
	{#snippet children({ checked: isChecked })}
		<span
			class="fl-dropdown-menu-checkbox-item-span"
		>
			{#if isChecked}
				<span
					class="fl-dropdown-menu-checkbox-item-span-2"
				>
					<span class="fl-dropdown-menu-checkbox-item-span-3"
					></span>
				</span>
			{/if}
		</span>
		{@render content?.()}
	{/snippet}
</CheckboxItem>
