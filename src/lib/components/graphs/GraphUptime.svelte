<!--
@component
A calendar-like grid of daily uptime statuses with date bounds and an overall uptime percentage.

@example
```svelte
<GraphUptime
  title="API"
  from="Jun 1"
  to="Aug 29"
  days={Array.from({ length: 90 }, (_, i) =>
    i === 41 || i === 42 ? 'down' : i === 18 || i === 60 ? 'degraded' : 'ok'
  )}
/>
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette } from '../frame/tone.js';

	/** Rows of day-status glyphs: ok / degraded / down. */
	export type UptimeStatus = 'ok' | 'degraded' | 'down' | 'empty';

	export interface GraphUptimeProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Daily statuses in chronological order, using ok, degraded, down, or empty. */
		days: UptimeStatus[];
		/** Optional label for the beginning of the displayed date range. */
		from?: string;
		/** Optional label for the end of the displayed date range. */
		to?: string;
		/** Number of day cells displayed on each row. */
		columns?: number;
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
	import { resolveGlyphs } from '../frame/glyphs.js';
	import { isMonoPalette } from '../frame/tone.js';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		days,
		from,
		to,
		columns = 30,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphUptimeProps = $props();

	const mono = $derived(isMonoPalette(palette));

	const view = $derived.by(() => {
		const set = resolveGlyphs(glyphs);
		const last = set.length - 1;
		const known = days.filter((day) => day !== 'empty');
		const ok = known.filter((day) => day === 'ok').length;
		const percent = known.length === 0 ? 0 : Math.round((ok / known.length) * 100);
		const cols = Math.max(1, columns);
		const rows: UptimeStatus[][] = [];
		for (let index = 0; index < days.length; index += cols) {
			rows.push(days.slice(index, index + cols));
		}
		const mark: Record<UptimeStatus, string> = {
			ok: set[last] ?? '█',
			degraded: set[Math.min(2, last)] ?? '▒',
			down: set[0] ?? '·',
			empty: '-'
		};
		return { percent, rows, mark, knownCount: known.length };
	});
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="upt">
			<div class="stack">
				<div class="grid" aria-hidden="true">
					{#each view.rows as row, rowIndex}
						<div class="week" use:reveal={{ delay: stagger(rowIndex, 40), amount: 0.4 }}>
							{#each row as day}
								<span
									class="cell"
									class:c-accent={day === 'ok'}
									class:c-accent2={day === 'degraded' && !mono}
									class:c-muted={day === 'degraded' && mono}
									class:c-frame={day === 'down' || day === 'empty'}
								>
									{view.mark[day]}
								</span>
							{/each}
						</div>
					{/each}
				</div>
				<div class="meta">
					{#if from || to}
						<p class="dates">
							{#if from}<span>{from}</span>{/if}
							{#if to}<span>{to}</span>{/if}
						</p>
					{/if}
					<p class="pct c-accent">{view.percent}%</p>
				</div>
			</div>
			<p class="legend">
				<span>
					<span class="lg c-accent" aria-hidden="true">{view.mark.ok}</span> up
				</span>
				<span>
					<span class="lg" class:c-accent2={!mono} class:c-muted={mono} aria-hidden="true">
						{view.mark.degraded}
					</span>
					slow
				</span>
				<span>
					<span class="lg c-frame" aria-hidden="true">{view.mark.down}</span> down
				</span>
			</p>
			<span class="sr-only">
				{view.percent} percent uptime over {view.knownCount} days{#if from && to}, {from}
				to {to}{/if}
			</span>
		</div>
	</FrameBody>
</Frame>

<style>
	.upt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.stack {
		display: flex;
		width: fit-content;
		max-width: 100%;
		flex-direction: column;
		gap: 1rem;
	}

	.grid {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		user-select: none;
	}

	.week {
		display: flex;
		justify-content: flex-start;
		gap: 0.125rem;
	}

	.cell {
		min-width: 1ch;
		text-align: center;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.dates {
		display: flex;
		margin: 0;
		gap: 0.75rem;
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.pct {
		margin: 0 0 0 auto;
		text-align: right;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		margin: 0;
		color: var(--text-secondary, oklch(0.62 0 0));
		gap: 0.25rem 1rem;
	}

	.lg {
		user-select: none;
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.c-accent2 {
		color: var(--graph-accent-2, oklch(0.78 0.12 70));
	}

	.c-muted {
		color: var(--text-secondary, oklch(0.62 0 0));
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
