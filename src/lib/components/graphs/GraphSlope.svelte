<!--
@component
A before-and-after slope chart: each row shows a from number, a direction arrow, and a to number,
with rising rows accented.

@example
```svelte
<GraphSlope
  title="TRAFFIC"
  palette="duo"
  fromLabel="2025"
  toLabel="2026"
  items={[
    { label: 'docs', from: 8200, to: 12400 },
    { label: 'copy', from: 5100, to: 4100 },
    { label: 'ship', from: 640, to: 860 }
  ]}
/>
```
-->

<script module lang="ts">
	import type { GraphPalette } from '../frame/tone.js';

	/** One before → after row. */
	export interface SlopeItem {
		/** Row name. */
		label: string;
		/** Value before the change. */
		from: number;
		/** Value after the change. */
		to: number;
	}

	export interface GraphSlopeProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Heading over the from-number column. */
		fromLabel: string;
		/** Heading over the to-number column. */
		toLabel: string;
		/** Rows to compare, each with a label and its from/to values. */
		items: SlopeItem[];
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
	import { toneRole } from '../frame/tone.js';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		fromLabel,
		toLabel,
		items,
		palette,
		corner,
		class: className = ''
	}: GraphSlopeProps = $props();

	function format(value: number) {
		return value.toLocaleString('en-US', {
			maximumFractionDigits: Number.isInteger(value) ? 0 : 1
		});
	}

	const rows = $derived.by(() =>
		items.map((row) => {
			const up = row.to > row.from;
			const down = row.to < row.from;
			const arrowRole = up
				? toneRole(palette, 'primary')
				: down
					? toneRole(palette, 'secondary')
					: 'empty';
			const toRole = up
				? 'accent'
				: down
					? toneRole(palette, 'secondary')
					: 'foreground';

			return {
				label: row.label,
				spoken: `${row.label} from ${format(row.from)} to ${format(row.to)}`,
				from: format(row.from),
				to: format(row.to),
				arrow: up || down ? '→' : '–',
				arrowRole,
				toRole
			};
		})
	);
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="col">
			<div class="head">
				<span></span>
				<span class="hlabel">{fromLabel}</span>
				<span></span>
				<span class="hlabel">{toLabel}</span>
			</div>
			<ul class="rows" role="list">
				{#each rows as row, i (row.label)}
					<li
						class="row"
						aria-label={row.spoken}
						use:reveal={{ delay: stagger(i, 40), amount: 0.4 }}
					>
						<span class="label">{row.label}</span>
						<span class="num muted">{row.from}</span>
						<span
							class="arrow"
							aria-hidden="true"
							class:c-accent={row.arrowRole === 'accent'}
							class:c-accent2={row.arrowRole === 'accent2'}
							class:c-accent3={row.arrowRole === 'accent3'}
							class:c-muted={row.arrowRole === 'muted'}
							class:c-frame={row.arrowRole === 'empty'}
						>
							{row.arrow}
						</span>
						<span
							class="num"
							class:c-accent={row.toRole === 'accent'}
							class:c-accent2={row.toRole === 'accent2'}
							class:c-accent3={row.toRole === 'accent3'}
							class:c-muted={row.toRole === 'muted'}
							class:c-fg={row.toRole === 'foreground'}
						>
							{row.to}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</FrameBody>
</Frame>

<style>
	.col {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 6.5rem 2rem 6.5rem;
		column-gap: 0.75rem;
		align-items: end;
	}

	.hlabel {
		text-align: right;
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 6.5rem 2rem 6.5rem;
		column-gap: 0.75rem;
		align-items: baseline;
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-primary, oklch(0.93 0 0));
	}

	.num {
		text-align: right;
	}

	.muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.arrow {
		text-align: center;
		user-select: none;
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.c-accent2 {
		color: var(--graph-accent-2, oklch(0.78 0.12 70));
	}

	.c-accent3 {
		color: var(--graph-accent-3, oklch(0.72 0.13 30));
	}

	.c-muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.c-frame {
		color: var(--border, oklch(0.6 0 0 / 0.5));
	}

	.c-fg {
		color: var(--text-primary, oklch(0.93 0 0));
	}
</style>
