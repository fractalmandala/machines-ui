<!--
@component
A row of two to four large figures with labels, each optionally hinted and accented.

@example
```svelte
<GraphStat
  title="THIS WEEK"
  items={[
    { value: '12,400', label: 'docs' },
    { value: '4,100', label: 'copies' },
    { value: '860', label: 'shipped', accent: true }
  ]}
/>
```
-->

<script module lang="ts">
	/** Large figures with labels. Two to four numbers, no trend. */
	export interface StatItem {
		value: string;
		label: string;
		hint?: string;
		accent?: boolean;
	}

	export interface GraphStatProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Figures to show left to right; only the first four are laid out. */
		items: StatItem[];
		/** Character drawn at each corner of the frame. */
		corner?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import Frame from '../frame/Frame.svelte';
	import FrameBody from '../frame/FrameBody.svelte';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		items,
		corner,
		class: className = ''
	}: GraphStatProps = $props();

	const columns = $derived(Math.min(items.length, 4));
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<ul
			class="stats"
			class:cols2={columns === 2}
			class:cols3={columns === 3}
			class:cols4={columns === 4}
			role="list"
		>
			{#each items as item, i (item.label)}
				<li class="stat" class:accent={item.accent} use:reveal={{ delay: stagger(i, 60) }}>
					<p class="value">{item.value}</p>
					<p class="muted">{item.label}</p>
					{#if item.hint}
						<p class="muted">{item.hint}</p>
					{/if}
				</li>
			{/each}
		</ul>
	</FrameBody>
</Frame>

<style>
	.stats {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 640px) {
		.cols2 {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.cols3 {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.cols4 {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.value {
		margin: 0;
		font-size: 1.875rem;
		line-height: 1.2;
		letter-spacing: -0.025em;
	}

	@media (min-width: 640px) {
		.value {
			font-size: 2.25rem;
		}
	}

	.muted {
		margin: 0;
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.stat.accent .value {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}
</style>
