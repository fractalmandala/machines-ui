<!--
@component
Two mini bar charts joined by an arrow, comparing a series before a processor with the series it
produces.

@example
```svelte
<script lang="ts">
	import { GraphBars, type BarSeries } from '@fractaldesign/machines-ui';

	const from: BarSeries = { label: 'draft', values: [1, 2, 2, 3, 1] };
	const to: BarSeries = { label: 'shipped', size: 'lg', values: [3, 5, 4, 6, 5] };
</script>

<GraphBars title="DRAFT TO SHIPPED" processor="edit" {from} {to} />
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette, ToneRole } from '../frame/tone.js';

	export interface BarSeries {
		/** Name of the series, shown under its bars. */
		label: string;
		/** Bar heights, oldest first. */
		values: number[];
		/** Bar height: `sm` is five rows, `lg` is eight. */
		size?: 'sm' | 'lg';
	}

	export interface GraphBarsProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** The starting series, drawn in muted bars. */
		from: BarSeries;
		/** The resulting series, drawn in accent bars. */
		to: BarSeries;
		/** Label on the arrow between the series, e.g. the step applied. */
		processor?: string;
		/** Characters that draw the graph: a preset name (`shade`, `ascii`, `hash`, `bar`) or your own array, lightest to heaviest. */
		glyphs?: Glyphs;
		/** How many accent colours the graph uses: `mono` one, `duo` two, `multi` three. */
		palette?: GraphPalette;
		/** Character drawn at each corner of the frame. */
		corner?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import Frame from '../frame/Frame.svelte';
	import FrameBody from '../frame/FrameBody.svelte';
	import GraphArrow from '../frame/GraphArrow.svelte';
	import { trackMarks } from '../frame/glyphs.js';
	import { toneRole } from '../frame/tone.js';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		from,
		to,
		processor,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphBarsProps = $props();

	const marks = $derived(trackMarks(glyphs));
	const fromHeight = $derived(from.size === 'lg' ? 8 : 5);
	const toHeight = $derived(to.size === 'lg' ? 8 : 5);
	const fromRole = $derived(toneRole(palette, 'secondary'));
	const spoken = $derived(
		`${from.label} to ${to.label}${processor ? ` via ${processor}` : ''}`
	);
</script>

{#snippet miniBars(values: number[], height: number, base: number, tone: 'accent' | 'muted')}
	{@const onRole: ToneRole =
		tone === 'accent' ? toneRole(palette, 'primary') : toneRole(palette, 'secondary')}
	<div class="bars" aria-hidden="true">
		{#each values as value, i (i)}
			{@const max = Math.max(...values, 1)}
			{@const level = Math.round((value / max) * (height - 1))}
			<span class="col" use:reveal={{ delay: base + stagger(i, 30) }}>
				{#each Array.from({ length: height }) as _, row (row)}
					{@const fromBottom = height - 1 - row}
					{@const on = fromBottom <= level}
					<span
						class="cell"
						class:off={!on}
						class:c-accent={on && onRole === 'accent'}
						class:c-accent2={on && onRole === 'accent2'}
						class:c-muted={on && onRole === 'muted'}>{on ? marks.fill : ' '}</span>
				{/each}
			</span>
		{/each}
	</div>
{/snippet}

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="flow">
			<div class="group">
				{@render miniBars(from.values, fromHeight, 40, 'muted')}
				<p
					class="label"
					class:c-muted={fromRole === 'muted'}
					class:c-accent2={fromRole === 'accent2'}>{from.label}</p>
			</div>

			<div class="mid">
				<GraphArrow />
				{#if processor}
					<span>{processor}</span>
				{/if}
				<GraphArrow />
			</div>

			<div class="group">
				{@render miniBars(to.values, toHeight, 160, 'accent')}
				<p class="label c-fg">{to.label}</p>
			</div>
		</div>
		<span class="sr-only">{spoken}</span>
	</FrameBody>
</Frame>

<style>
	.flow {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
	}

	@media (min-width: 640px) {
		.flow {
			flex-direction: row;
			align-items: flex-end;
			justify-content: center;
			gap: 2rem;
		}
	}

	.group {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.bars {
		display: flex;
		align-items: flex-end;
		gap: 0.25rem;
	}

	.col {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		width: 1ch;
	}

	.cell {
		height: 1em;
		width: 100%;
		text-align: center;
	}

	.off {
		color: transparent;
	}

	.mid {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	@media (max-width: 639.98px) {
		.mid {
			transform: rotate(90deg);
		}
	}

	.label {
		margin: 0;
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.c-accent2 {
		color: var(--graph-accent-2, oklch(0.78 0.12 70));
	}

	.c-fg {
		color: var(--text-primary, oklch(0.93 0 0));
	}

	.c-muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border-width: 0;
	}
</style>
