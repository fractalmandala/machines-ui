<!--
@component
A running-total chart that shows how sequential increases and decreases contribute to a final value.

@example
```svelte
<GraphWaterfall
  title="MARGIN"
  palette="duo"
  ticks={18}
  items={[
    { label: 'Revenue', value: 48 },
    { label: 'Refunds', value: -6 },
    { label: 'Hosting', value: -4 },
    { label: 'Profit', value: 38 }
  ]}
/>
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette } from '../frame/tone.js';

	/** Running total drawn as floating bars over a shared scale. */
	export type WaterfallKind = 'start' | 'in' | 'out' | 'end';

	export interface WaterfallItem {
		label: string;
		value: number;
		display?: string;
		kind?: WaterfallKind;
	}

	export interface GraphWaterfallProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Values in sequence; each item contributes a start, increase, decrease, or ending total. */
		items: WaterfallItem[];
		/** Number of character positions used to draw the chart scale. */
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
	import FrameRule from '../frame/FrameRule.svelte';
	import GraphTrack from '../frame/GraphTrack.svelte';
	import GraphTick from '../frame/GraphTick.svelte';
	import { trackMarks } from '../frame/glyphs.js';
	import { isMonoPalette } from '../frame/tone.js';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		items,
		ticks = 24,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphWaterfallProps = $props();

	const mono = $derived(isMonoPalette(palette));

	interface Segment {
		label: string;
		value: number;
		display?: string;
		kind: WaterfallKind;
		from: number;
		to: number;
		start: number;
		end: number;
	}

	function formatValue(item: { value: number; display?: string }, kind: WaterfallKind) {
		if (item.display) {
			return item.display;
		}

		const absolute = Math.abs(item.value);

		if (kind === 'in') {
			return `+${absolute.toLocaleString('en-US')}`;
		}

		if (kind === 'out') {
			return `−${absolute.toLocaleString('en-US')}`;
		}

		return item.value.toLocaleString('en-US');
	}

	const view = $derived.by(() => {
		const marks = trackMarks(glyphs);
		let run = 0;
		const segments: Segment[] = items.map((entry, index) => {
			const kind: WaterfallKind =
				entry.kind ??
				(index === 0
					? 'start'
					: index === items.length - 1
						? 'end'
						: entry.value >= 0
							? 'in'
							: 'out');
			const magnitude = Math.abs(entry.value);
			let from: number;
			let to: number;

			if (kind === 'start') {
				from = 0;
				to = entry.value;
				run = entry.value;
			} else if (kind === 'in') {
				from = run;
				to = run + magnitude;
				run = to;
			} else if (kind === 'out') {
				to = run;
				from = run - magnitude;
				run = from;
			} else {
				from = 0;
				to = entry.value;
				run = to;
			}

			return {
				label: entry.label,
				value: entry.value,
				display: entry.display,
				kind,
				from,
				to,
				start: 0,
				end: 0
			};
		});
		const lows = segments.map((segment) => Math.min(segment.from, segment.to));
		const highs = segments.map((segment) => Math.max(segment.from, segment.to));
		const low = Math.min(0, ...lows);
		const high = Math.max(1, ...highs);
		const span = high - low || 1;

		const column = (value: number) => Math.round(((value - low) / span) * ticks);

		for (const segment of segments) {
			const start = Math.min(column(segment.from), column(segment.to));
			segment.start = start;
			segment.end = Math.max(column(segment.from), column(segment.to), start + 1);
		}

		return { segments, marks };
	});
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<ul class="falls" role="list">
			{#each view.segments as segment, index (segment.label)}
				<li class="fall">
					{#if segment.kind === 'end' && index > 0}
						<FrameRule />
					{/if}
					<div class="row" use:reveal={{ delay: stagger(index, 40), amount: 0.4 }}>
						<span class="label">{segment.label}</span>
						<GraphTrack>
							{#each Array.from({ length: ticks }) as _, cell}
								{@const filled = cell >= segment.start && cell < segment.end}
								<GraphTick>
									<span
										class="g"
										class:c-frame={!filled}
										class:c-accent={filled && segment.kind !== 'out' && segment.kind !== 'start'}
										class:c-accent2={filled && segment.kind === 'out' && !mono}
										class:c-muted={filled && segment.kind === 'out' && mono}
										class:c-fg={filled && segment.kind === 'start'}
									>
										{filled ? view.marks.fill : view.marks.empty}
									</span>
								</GraphTick>
							{/each}
						</GraphTrack>
						<span
							class="value"
							class:c-accent={segment.kind === 'end'}
							class:c-accent2={segment.kind === 'out' && !mono}
							class:c-muted={segment.kind === 'out' && mono}
							class:c-fg={segment.kind === 'start' || segment.kind === 'in'}
						>
							{formatValue(segment, segment.kind)}
						</span>
					</div>
				</li>
			{/each}
		</ul>
		<span class="sr-only">
			{view.segments
				.map((segment) => `${segment.label} ${formatValue(segment, segment.kind)}`)
				.join(', ')}
		</span>
	</FrameBody>
</Frame>

<style>
	.falls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.fall {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.row {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr) 5.5rem;
		align-items: center;
		column-gap: 1rem;
	}

	.label {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		color: var(--text-primary, oklch(0.93 0 0));
	}

	.g {
		user-select: none;
	}

	.value {
		text-align: right;
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

	.c-fg {
		color: var(--text-primary, oklch(0.93 0 0));
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
