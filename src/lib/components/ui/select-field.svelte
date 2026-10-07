<script module lang="ts">
	import './select-field.css';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/utils.js';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte';
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte';
	import DropdownMenuRadioGroup from '$lib/components/ui/shadcn/DropdownMenuRadioGroup.svelte';
	import DropdownMenuRadioItem from '$lib/components/ui/shadcn/DropdownMenuRadioItem.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte';
	import ChevronIcon from '$lib/icons/flow/chevron-right.svelte';
	import { fieldSurface } from './field.svelte';

	type SelectFieldProps = {
		id?: string;
		value: string;
		options: readonly string[];
		onChange: (value: string) => void;
		leading?: Snippet;
		className?: string;
		align?: 'start' | 'end';
	};
</script>

<script lang="ts">
	let {
		id,
		value,
		options,
		onChange,
		leading,
		className,
		align = 'start'
	}: SelectFieldProps = $props();
</script>

<DropdownMenu>
	<DropdownMenuTrigger
		{id}
		className={cn(
			fieldSurface,
			'fl-select-field-group fl-select-field',
			className
		)}
	>
		{@render leading?.()}
		<span class="fl-select-field-span">{value}</span>
		<ChevronIcon
			aria-hidden
			class="fl-select-field-chevron-icon"
		/>
	</DropdownMenuTrigger>
	<DropdownMenuContent {align} className="fl-select-field-dropdown-menu-conten">
		<DropdownMenuRadioGroup {value} onValueChange={onChange}>
			{#each options as option (option)}
				<DropdownMenuRadioItem value={option}>{option}</DropdownMenuRadioItem>
			{/each}
		</DropdownMenuRadioGroup>
	</DropdownMenuContent>
</DropdownMenu>
