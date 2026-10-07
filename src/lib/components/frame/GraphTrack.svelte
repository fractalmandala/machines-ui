<!--
@component

@example
```svelte
<GraphTrack>
  {#each glyphs as glyph}
    <GraphTick>{glyph}</GraphTick>
  {/each}
</GraphTrack>
```
-->

<script module lang="ts">
	import type { Snippet } from 'svelte';

	/**
	 * Horizontal track that spans the frame. Use for graphs that represent
	 * a range (meter, stack, bullet, rank) — pair with GraphTick so ticks
	 * flex edge to edge. Packed graphs (spark, bars, cells, uptime) should
	 * not use tracks.
	 */
	export interface GraphTrackProps {
		class?: string;
		/** Content rendered inside the component. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	let { class: className = '', children }: GraphTrackProps = $props();
</script>

<span class="track {className}" aria-hidden="true">
	{@render children?.()}
</span>

<style>
	.track {
		display: flex;
		width: 100%;
		min-width: 0;
		user-select: none;
	}
</style>
