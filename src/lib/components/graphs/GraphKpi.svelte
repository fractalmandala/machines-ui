<!--
@component
One headline number with a label, an optional hint, and a glyph sparkline of the recent trend.

@example
```svelte
<GraphKpi
  title="READS"
  value="12,400"
  label="this week"
  hint="+18%"
  data={[4, 5, 5, 6, 8, 7, 9, 8, 11, 10, 12, 14]}
/>
```
-->
<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette } from '../frame/tone.js';

	/** One headline number with label, optional hint, and a glyph sparkline. */
	export interface GraphKpiProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** The headline figure, already formatted (e.g. "12,400"). */
		value: string;
		/** Muted line under the figure, e.g. "this week". */
		label: string;
		/** Second muted line under the figure, e.g. "+18%". */
		hint?: string;
		/** Trend values for the glyph sparkline, oldest first. */
		data: number[];
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
	import { reveal } from '../frame/motion.js';

	let {
		title,
		value,
		label,
		hint,
		data,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphKpiProps = $props();

	const SPARK_DEFAULT = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

	const set = $derived(glyphs == null ? SPARK_DEFAULT : resolveGlyphs(glyphs));
	const max = $derived(Math.max(...data, 1));
	const last = $derived(data.length - 1);
	const mono = $derived(isMonoPalette(palette));

	const points = $derived.by(() =>
		data.map((entry) => {
			const index = Math.round((entry / max) * (set.length - 1));
			return set[index] ?? set[0] ?? '▁';
		})
	);
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="col">
			<div class="head" use:reveal={{ amount: 0.5 }}>
				<p class="value c-accent">{value}</p>
				<div class="meta">
					<p class="muted">{label}</p>
					{#if hint}
						<p class="muted">{hint}</p>
					{/if}
				</div>
			</div>
			{#if points.length > 0}
				<div class="spark" aria-hidden="true" use:reveal={{ amount: 0.5 }}>
					{#each points as glyph, i}
						<span
							class="pt"
							class:c-accent={i === last}
							class:c-muted={i !== last && mono}
							class:c-accent2={i !== last && !mono}
							class:dim={i !== last && mono}
						>
							{glyph}
						</span>
					{/each}
				</div>
			{/if}
			<span class="sr-only">
				{value}
				{label}{#if hint}. {hint}{/if}
			</span>
		</div>
	</FrameBody>
</Frame>

<style>
	.col {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.head {
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

	.meta {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.muted {
		margin: 0;
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.spark {
		display: flex;
		justify-content: flex-start;
		gap: 0.125rem;
		width: 100%;
		min-width: 0;
		user-select: none;
	}

	.pt {
		flex: none;
		min-width: 1ch;
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

	.dim {
		opacity: 0.4;
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
