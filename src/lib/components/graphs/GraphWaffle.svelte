<!--
@component

@example
```svelte
<GraphWaffle title="COVERAGE" value={0.73} caption="73 of 100 tests green" />
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';

	/** Share grid of ~100 cells; filled cells carry the accent. */
	export interface GraphWaffleProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Filled share of the grid, from 0 to 1. */
		value: number;
		/** Total number of cells in the grid. */
		cells?: number;
		/** Number of cells per row. */
		columns?: number;
		/** Optional explanatory text displayed below the percentage. */
		caption?: string;
		/** Characters that draw the graph: a preset name (`shade`, `ascii`, `hash`, `bar`) or your own array, lightest to heaviest. */
		glyphs?: Glyphs;
		/** Character drawn at each corner of the frame. */
		corner?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import Frame from '../frame/Frame.svelte';
	import FrameBody from '../frame/FrameBody.svelte';
	import { trackMarks } from '../frame/glyphs.js';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		value,
		cells = 100,
		columns = 10,
		caption,
		glyphs,
		corner,
		class: className = ''
	}: GraphWaffleProps = $props();

	const view = $derived.by(() => {
		const clamped = Math.min(1, Math.max(0, value));
		const filled = Math.round(clamped * cells);
		const rowCount = Math.ceil(cells / columns);
		const marks = trackMarks(glyphs, { empty: '░', rest: '░', fill: '█' });
		const percent = Math.round(clamped * 100);
		return { filled, rowCount, marks, percent };
	});
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="wrap">
			<div class="grid" aria-hidden="true">
				{#each Array.from({ length: view.rowCount }) as _, row}
					<div class="wrow" use:reveal={{ delay: stagger(row, 40), amount: 0.4 }}>
						{#each Array.from({ length: columns }) as _, column}
							{@const index = row * columns + column}
							{#if index >= cells}
								<span class="cell"></span>
							{:else}
								<span
									class="cell"
									class:c-accent={index < view.filled}
									class:c-frame={index >= view.filled}
								>
									{index < view.filled ? view.marks.fill : view.marks.empty}
								</span>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
			<p class="pct c-accent">{view.percent}%</p>
			{#if caption}
				<p class="muted">{caption}</p>
			{/if}
			<span class="sr-only">{view.percent} percent{#if caption}. {caption}{/if}</span>
		</div>
	</FrameBody>
</Frame>

<style>
	.wrap {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.grid {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		user-select: none;
	}

	.wrow {
		display: flex;
		justify-content: center;
		gap: 0.125rem;
	}

	.cell {
		min-width: 1ch;
		text-align: center;
	}

	.pct {
		margin: 0;
	}

	.muted {
		margin: 0;
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.c-frame {
		color: var(--border, oklch(0.6 0 0 / 0.5));
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
