<script module lang="ts">
	import './DropdownMenuRadioItem.css';
	import '$lib/styles/palette.css';
	import type { DropdownItemProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { cn } from '$lib/utils/utils.js';

	const item =
		'fl-dropdown-menu-radio-item-item';
</script>

<script lang="ts">
	import { RadioItem } from './dropdown-menu/index.js';
	
	import type { Snippet } from 'svelte';

	let {
		className,
		children: content,
		...props
	}: Omit<DropdownItemProps & { value?: string }, 'children'> & { className?: string; children?: Snippet } =
		$props();
</script>

<RadioItem
	data-slot="dropdown-menu-radio-item"
	class={cn(item, 'fl-dropdown-menu-radio-item', className)}
	{...props}
>
	{#snippet children({ checked: isChecked })}
		<span class="fl-dropdown-menu-radio-item-span">
			{#if isChecked}
				<span
					class="fl-dropdown-menu-radio-item-span-2"
				></span>
			{/if}
		</span>
		{@render content?.()}
	{/snippet}
</RadioItem>
