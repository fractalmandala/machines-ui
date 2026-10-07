<!--
@component

@example
```svelte
<GraphMeter title="SHIPPED" value={0.67} caption="characters, not a progress bar" />
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette } from '../frame/tone.js';

	/** Horizontal progress bar that spans the frame: [ = = = - - - ] 42%. */
	export interface GraphMeterProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Fraction filled, from 0 to 1. */
		value: number;
		/** Number of ticks the bar is divided into. */
		ticks?: number;
		/** Optional muted caption shown under the bar. */
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
	import GraphTrack from '../frame/GraphTrack.svelte';
	import GraphTick from '../frame/GraphTick.svelte';
	import { reveal } from '../frame/motion.js';
	import { trackMarks } from '../frame/glyphs.js';

	let {
		title,
		value,
		ticks = 14,
		caption,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphMeterProps = $props();

	const clamped = $derived(Math.min(1, Math.max(0, value)));
	const filled = $derived(Math.round(clamped * ticks));
	const marks = $derived(trackMarks(glyphs, { empty: '-', rest: '=', fill: '=' }));
	const indexes = $derived(Array.from({ length: ticks }, (_, i) => i));
	const percent = $derived(Math.round(clamped * 100));
	const spoken = $derived(`${percent} percent${caption ? ` ${caption}` : ''}`);
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="meter" use:reveal={{ amount: 0.5 }}>
			<p class="bar">
				<span class="brace" aria-hidden="true">[</span>
				<GraphTrack>
					{#each indexes as index (index)}
						<GraphTick>
							<span class="g" class:fill={index < filled}>
								{index < filled ? marks.fill : marks.empty}
							</span>
						</GraphTick>
					{/each}
				</GraphTrack>
				<span class="brace" aria-hidden="true">]</span>
				<span class="pct">{percent}%</span>
			</p>
			{#if caption}
				<p class="muted">{caption}</p>
			{/if}
			<span class="sr-only">{spoken}</span>
		</div>
	</FrameBody>
</Frame>

<style>
	.meter {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.bar {
		display: flex;
		width: 100%;
		align-items: center;
		column-gap: 0.75rem;
		margin: 0;
	}

	.brace {
		user-select: none;
		color: var(--border, oklch(0.6 0 0 / 0.5));
	}

	.g {
		color: var(--border, oklch(0.6 0 0 / 0.5));
	}

	.g.fill {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.pct {
		width: 4ch;
		flex-shrink: 0;
		text-align: right;
		color: var(--graph-accent, oklch(0.78 0.17 155));
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
