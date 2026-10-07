<!--
@component

@example
```svelte
<GraphArrow />
```
-->

<script module lang="ts">
	/** Dashed arrow between flow nodes. `stretch` spans the available row. */
	export interface GraphArrowProps {
		/** Draw the arrow in the theme accent colour instead of the border colour. */
		accent?: boolean;
		/** Span the available row with a flexing dashed line instead of a fixed `- - -`. */
		stretch?: boolean;
		class?: string;
	}
</script>

<script lang="ts">
	let { accent = false, stretch = false, class: className = '' }: GraphArrowProps = $props();
</script>

<div class="arrow {className}" class:accent class:stretch aria-hidden="true">
	{#if stretch}
		<span class="line"></span>
	{:else}
		<span>- - -</span>
	{/if}
	<span class="head">▶</span>
</div>

<style>
	.arrow {
		display: flex;
		min-width: 1.5rem;
		align-items: center;
		gap: 0.25rem;
		color: var(--border, oklch(0.6 0 0 / 0.5));
	}

	.stretch {
		min-width: 2.5rem;
		flex: 1;
	}

	.accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.line {
		height: 1px;
		min-width: 1.5rem;
		flex: 1;
		border-top: 1px dashed currentColor;
	}

	.head {
		flex-shrink: 0;
	}
</style>
