<script lang="ts">
	import './Number.css';
	import { useMeasure } from '$lib/components/ui/use-measure.svelte.js';

	let { mv, number }: { mv: { get(): number }; number: number } = $props();
	const box = useMeasure<HTMLSpanElement>();
	let offset = $derived((10 + number - (mv.get() % 10)) % 10);
	let y = $derived(offset > 5 ? (offset - 10) * box.height : offset * box.height);
</script>

<span bind:this={box.node} class="fs-absolute fl-number">{number}</span>
{#if box.height}
	<span
		class="fs-absolute fs-row fs-ycenter fs-xcenter fl-number-span"
		style:transform={`translateY(${y}px)`}
	>
		{number}
	</span>
{/if}
