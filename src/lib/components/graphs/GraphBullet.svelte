<!--
@component
A bullet chart: each row lays an actual value against an optional target along a ticked track,
with the value shown at the right.

@example
```svelte
<GraphBullet
  title="LOAD"
  palette="duo"
  items={[
    { label: 'CPU', value: 72, target: 80, max: 100 },
    { label: 'RAM', value: 34, target: 64, max: 100 },
    { label: 'SSD', value: 91, target: 90, max: 100 }
  ]}
/>
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette } from '../frame/tone.js';

	/** One bullet row: actual value against an optional target. */
	export interface BulletItem {
		/** Row name. */
		label: string;
		/** Actual value plotted on the track. */
		value: number;
		/** Optional target marker drawn on the track. */
		target?: number;
		/** Value that fills the whole track; defaults to the larger of value and target. */
		max?: number;
		/** Preformatted figure to show instead of the computed value. */
		display?: string;
	}

	export interface GraphBulletProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Rows to plot, one bullet each. */
		items: BulletItem[];
		/** Track length in cells. Default 20. */
		ticks?: number;
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
	import GraphTrack from '../frame/GraphTrack.svelte';
	import GraphTick from '../frame/GraphTick.svelte';
	import { trackMarks } from '../frame/glyphs.js';
	import { toneRole, type ToneRole } from '../frame/tone.js';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		items,
		ticks = 20,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphBulletProps = $props();

	function formatItem(item: BulletItem) {
		if (item.display) {
			return item.display;
		}

		const value = item.value.toLocaleString('en-US', {
			maximumFractionDigits: Number.isInteger(item.value) ? 0 : 1
		});

		if (item.target == null) {
			return value;
		}

		const target = item.target.toLocaleString('en-US', {
			maximumFractionDigits: Number.isInteger(item.target) ? 0 : 1
		});

		return `${value} / ${target}`;
	}

	const marks = $derived(trackMarks(glyphs, { empty: '-', rest: '=', fill: '=' }));

	const rows = $derived.by(() =>
		items.map((entry) => {
			const peak = entry.max ?? Math.max(entry.value, entry.target ?? 0, 1);
			const filled = Math.min(
				ticks,
				Math.round((Math.max(entry.value, 0) / peak) * ticks)
			);
			const mark =
				entry.target == null
					? null
					: Math.min(
							ticks - 1,
							Math.max(0, Math.round((Math.max(entry.target, 0) / peak) * ticks))
						);

			const cells = Array.from({ length: ticks }, (_, index) => {
				const isMark = mark != null && index === mark;
				const isFill = index < filled;
				const role: ToneRole = isMark
					? toneRole(palette, 'secondary')
					: isFill
						? mark != null && index > mark
							? toneRole(palette, 'secondary')
							: toneRole(palette, 'primary')
						: 'empty';

				return {
					glyph: isMark ? '|' : isFill ? marks.fill : marks.empty,
					role
				};
			});

			return {
				label: entry.label,
				spoken: `${entry.label} ${formatItem(entry)}`,
				text: formatItem(entry),
				cells
			};
		})
	);
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<ul class="rows" role="list">
			{#each rows as row, i (row.label)}
				<li
					class="row"
					aria-label={row.spoken}
					use:reveal={{ delay: stagger(i, 40), amount: 0.4 }}
				>
					<span class="label">{row.label}</span>
					<span class="zone">
						<span class="c-frame" aria-hidden="true">[</span>
						<GraphTrack>
							{#each row.cells as cell}
								<GraphTick>
									<span
										class="g"
										class:c-accent={cell.role === 'accent'}
										class:c-accent2={cell.role === 'accent2'}
										class:c-accent3={cell.role === 'accent3'}
										class:c-muted={cell.role === 'muted'}
										class:c-frame={cell.role === 'empty'}
									>
										{cell.glyph}
									</span>
								</GraphTick>
							{/each}
						</GraphTrack>
						<span class="c-frame" aria-hidden="true">]</span>
					</span>
					<span class="num muted">{row.text}</span>
				</li>
			{/each}
		</ul>
	</FrameBody>
</Frame>

<style>
	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.row {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr) 7rem;
		column-gap: 1rem;
		align-items: center;
	}

	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-primary, oklch(0.93 0 0));
	}

	.zone {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.g {
		display: block;
	}

	.num {
		text-align: right;
	}

	.muted {
		color: var(--text-secondary, oklch(0.62 0 0));
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
</style>
