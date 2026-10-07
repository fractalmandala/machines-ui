<script lang="ts">
	import type { Snippet } from 'svelte';
	import Tooltip from '$lib/components/ui/shadcn/tooltip.svelte';
	import TooltipContent from '$lib/components/ui/shadcn/TooltipContent.svelte';
	import TooltipTrigger from '$lib/components/ui/shadcn/TooltipTrigger.svelte';

	type TriggerProps = { class?: string; [key: string]: any };

	let { title, expanded, children }: { title: string; expanded: boolean; children: Snippet<[TriggerProps]> } =
		$props();
</script>

<Tooltip>
	<TooltipTrigger>
		{#snippet child({ props })}
			{@render children?.(props)}
		{/snippet}
	</TooltipTrigger>
	{#if !expanded}
		<TooltipContent side="right">{title}</TooltipContent>
	{/if}
</Tooltip>
