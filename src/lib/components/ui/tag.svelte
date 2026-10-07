<script module lang="ts">
	import './tag.css';
	import '$lib/styles/palette.css';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/utils.js';

	export type TagTone = 'violet' | 'green' | 'red' | 'cyan' | 'neutral' | 'amber';

	const tones: Record<TagTone, string> = {
		violet:
			'fl-tag-tones',
		green:
			'fl-tag-tones-2',
		red: 'fl-tag-tones-3',
		cyan: 'fl-tag-tones-4',
		amber:
			'fl-tag-tones-5',
		neutral: 'fl-tag-tones-6'
	};

	type TagProps = {
		tone: TagTone;
		children: Snippet;
		className?: string;
	};
</script>

<script lang="ts">
	let { tone, children, className }: TagProps = $props();
</script>

<span
	class={cn(
		'fl-tag',
		tones[tone],
		className
	)}
>
	{@render children?.()}
</span>
