<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import { getTooltipRoot, type TooltipArrowProps } from './tooltip-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		width = 8,
		height = 8,
		children,
		...rest
	}: TooltipArrowProps = $props();

	const rootState = getTooltipRoot();

	// The arrow anchors to the content side opposite the placed side; the
	// content component publishes arrow coordinates on the root state.
	let arrow = $derived(rootState.arrow);
	let baseSide = $derived(
		arrow ? ({ top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const)[arrow.side] : 'bottom'
	);

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		'data-state': rootState.stateAttr,
		style: {
			position: 'absolute',
			left: arrow ? `${arrow.x}px` : undefined,
			top: arrow ? `${arrow.y}px` : undefined,
			[baseSide]: 0,
			width: `${width}px`,
			height: `${height}px`,
			transform: 'rotate(45deg)',
			...(rest.style as Record<string, unknown> | undefined)
		}
	});
</script>

{#if child}
	{@render child({ props: mergedProps })}
{:else}
	<span {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.()}
	</span>
{/if}
