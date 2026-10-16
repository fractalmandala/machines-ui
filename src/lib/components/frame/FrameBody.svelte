<!--
@component
The content region inside a graph frame, with optional compact spacing for dense layouts.

@example
```svelte
<Frame title="BODY">
  <FrameBody>
    <p>Row one</p>
    <p>Row two</p>
  </FrameBody>
</Frame>
```
-->

<script module lang="ts">
	import type { Snippet } from 'svelte';

	export interface GraphBodyProps {
		class?: string;
		/** Compact padding for dense graphs like Table and Invoice. */
		tight?: boolean;
		/** Content rendered inside the component. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	let { class: className = '', tight = false, children }: GraphBodyProps = $props();
</script>

<div class="body {className}" class:tight>
	{@render children?.()}
</div>

<style>
	/* Clears the [ TITLE ] caption on the top edge and the four corner glyphs.
	   Only when the Frame doesn't pad itself, so pad="sm|md|lg" never doubles up. */
	:global(.graph[data-pad='none']) > .body {
		padding: 1.25em 1.5ch 1em;
	}

	:global(.graph[data-pad='none']) > .body.tight {
		padding: 1em 1ch 0.75em;
	}
</style>
