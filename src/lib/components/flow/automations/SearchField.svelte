<script lang="ts">
	import './SearchField.css';
	import { fieldSurface } from '$lib/components/ui/field.js';
	import { cn } from '$lib/utils/utils.js';
	import SearchIcon from '$lib/icons/topbar/search.svelte';

	let {
		value,
		onChange,
		className,
		large
	}: { value: string; onChange: (value: string) => void; className?: string; large?: boolean } =
		$props();
</script>

<label class={cn('fs-relative fs-minw0 fl-search-field', className)}>
	<span class="fl-search-field-span">Search automations</span>
	<SearchIcon
		aria-hidden
		class={cn(
			'fs-absolute fl-search-field-search-icon',
			large ? 'fl-search-field-search-icon-1' : 'fl-search-field-search-icon-2'
		)}
	/>
	<input
		type="search"
		{value}
		placeholder={large ? 'Search automations' : 'Search'}
		oninput={(event) => onChange(event.currentTarget.value)}
		class={cn(
			fieldSurface,
			'fs-wfull fs-pr-md fl-search-field-input',
			large ? 'fl-search-field-input-1' : 'fl-search-field-input-2'
		)}
	/>
</label>
