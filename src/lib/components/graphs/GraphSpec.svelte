<!--
@component
A labeled specification list with optional accent styling on individual values.

@example
```svelte
<GraphSpec
  title="TYPE"
  rows={[
    { label: 'Family', value: 'Geist Mono' },
    { label: 'Size', value: '14 / 21' },
    { label: 'Tracking', value: '+0.02em' },
    { label: 'Figures', value: 'tabular' },
    { label: 'Accent', value: '--graph-accent', accent: true },
    { label: 'Duo', value: '--graph-accent-2' },
    { label: 'Tri', value: '--graph-accent-3' }
  ]}
/>
```
-->

<script module lang="ts">
	export interface SpecRow {
		label: string;
		value: string;
		accent?: boolean;
	}

	export interface GraphSpecProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Labeled values in display order, with an optional accent flag for each value. */
		rows: SpecRow[];
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
		rows,
		corner,
		class: className = ''
	}: GraphSpecProps = $props();
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<dl class="rows">
			{#each rows as row, i (row.label)}
				<div class="row" use:reveal={{ delay: stagger(i, 40), amount: 0.5 }}>
					<dt class="muted">{row.label}</dt>
					<dd class="value" class:accent={row.accent}>{row.value}</dd>
				</div>
			{/each}
		</dl>
	</FrameBody>
</Frame>

<style>
	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(7rem, 11rem) minmax(0, 1fr);
		align-items: baseline;
		column-gap: 1.5rem;
	}

	.muted {
		margin: 0;
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.value {
		margin: 0;
	}

	.value.accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}
</style>
