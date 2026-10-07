<!--
@component

@example
```svelte
<GraphTrack>
  <GraphTick>█</GraphTick>
  <GraphTick>░</GraphTick>
</GraphTrack>
```
-->

<script module lang="ts">
	import type { Snippet } from 'svelte';

	/** One glyph on a GraphTrack: flexes to fill, stays 1ch wide, centered. */
	export interface GraphTickProps {
		class?: string;
		/** Content rendered inside the component. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	let { class: className = '', children }: GraphTickProps = $props();
</script>

<span class="tick {className}">
	{@render children?.()}
</span>

<style>
	.tick {
		flex: 1 1 0%;
		min-width: 1ch;
		text-align: center;
	}
</style>
