<script module lang="ts">
	import './segmented-tabs.css';
	import { cn } from '$lib/utils/utils.js';
	import Button from './button.svelte';

	type SegmentedTabsProps<T extends string> = {
		label: string;
		items: readonly {
			value: T;
			label: string;
		}[];
		value: T;
		onChange: (value: T) => void;
		className?: string;
	};

	const active =
		'fl-segmented-tabs-active';
</script>

<script lang="ts" generics="T extends string">
	let { label, items, value, onChange, className }: SegmentedTabsProps<T> = $props();

	let listRef = $state<HTMLDivElement | null>(null);

	let wrap = $derived(items.length > 3);

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
		event.preventDefault();
		const index = items.findIndex((item) => item.value === value);
		const step = event.key === 'ArrowRight' ? 1 : -1;
		const next = items[(index + step + items.length) % items.length];
		onChange(next.value);
		const list = listRef;
		requestAnimationFrame(() =>
			list?.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`)?.focus()
		);
	};
</script>

<div
	bind:this={listRef}
	role="tablist"
	aria-label={label}
	tabindex="0"
	onkeydown={handleKeyDown}
	class={cn(
		'fl-segmented-tabs',
		wrap ? 'fl-segmented-tabs-1' : 'fl-segmented-tabs-2',
		className
	)}
>
	{#each items as item (item.value)}
		<Button
			variant="tab"
			size="tab"
			role="tab"
			data-value={item.value}
			aria-selected={value === item.value}
			tabindex={value === item.value ? 0 : -1}
			onClick={() => onChange(item.value)}
		>
			<span aria-hidden="true" class="fl-segmented-tabs-span">{item.label}</span>
			<span class="fl-segmented-tabs-span-2">{item.label}</span>
			<span
				aria-hidden="true"
				data-active={value === item.value || undefined}
				class={cn(
					'fl-segmented-tabs-span-3',
					active
				)}
			>
				{item.label}
			</span>
		</Button>
	{/each}
</div>
