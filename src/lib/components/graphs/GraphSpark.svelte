<!--
@component

@example
```svelte
<GraphSpark
  title="LATENCY"
  data={[2, 3, 4, 3, 6, 5, 8, 7, 9, 6, 10, 8]}
  caption="last point is the accent"
/>
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette } from '../frame/tone.js';

	/** Packed 1ch sparkline, centered with a small gap. Never stretched. */
	export interface GraphSparkProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Trend values, oldest first; the last point is drawn in the accent colour. */
		data: number[];
		/** Muted line drawn under the sparkline. */
		caption?: string;
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
	import { reveal } from '../frame/motion.js';
	import { resolveGlyphs } from '../frame/glyphs.js';
	import { isMonoPalette, toneRole } from '../frame/tone.js';

	const SPARK_DEFAULT: readonly string[] = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

	let {
		title,
		data,
		caption,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphSparkProps = $props();

	const max = $derived(Math.max(...data, 1));
	const last = $derived(data.length - 1);
	const mono = $derived(isMonoPalette(palette));
	const set = $derived(glyphs == null ? SPARK_DEFAULT : resolveGlyphs(glyphs));
	const points = $derived(
		data.map((value) => {
			const index = Math.round((value / max) * (set.length - 1));
			return set[index] ?? set[0] ?? '▁';
		})
	);
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="sparkwrap" use:reveal={{ amount: 0.5 }}>
			<span class="spark" aria-hidden="true">
				{#each points as glyph, index (`${glyph}-${index}`)}
					{@const live = index === last}
					{@const role = live ? 'accent' : toneRole(palette, 'secondary')}
					<span
						class="cell"
						class:c-accent={role === 'accent'}
						class:c-accent2={role === 'accent2'}
						class:c-muted={role === 'muted'}
						class:recede={!live && mono}
					>{glyph}</span>
				{/each}
			</span>
			{#if caption}
				<p class="muted">{caption}</p>
			{/if}
			<span class="sr-only">Sparkline with {data.length} points{caption ? `. ${caption}` : ''}</span>
		</div>
	</FrameBody>
</Frame>

<style>
	.sparkwrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.spark {
		display: flex;
		justify-content: center;
		column-gap: 0.125rem;
		user-select: none;
	}

	.cell {
		flex: none;
		min-width: 1ch;
		text-align: center;
	}

	.cell.recede {
		opacity: 0.4;
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

	.muted {
		margin: 0;
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
