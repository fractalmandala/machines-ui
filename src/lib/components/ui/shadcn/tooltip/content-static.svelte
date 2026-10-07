<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		computeTooltipPosition,
		getTooltipRoot,
		type TooltipContentProps,
		type TooltipSide
	} from './tooltip-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		side = 'top',
		sideOffset = 0,
		align = 'center',
		alignOffset = 0,
		avoidCollisions = true,
		collisionPadding = 0,
		id = `tooltip-content-${uid}`,
		style,
		children,
		...rest
	}: TooltipContentProps = $props();

	const rootState = getTooltipRoot();

	// ContentStatic mirrors bits-ui: same rendering as Content but inline
	// (no portal) and always mounted (no presence deferral).
	let x = $state(0);
	let y = $state(0);
	const initialSide: TooltipSide = side;
	let placedSide = $state<TooltipSide>(initialSide);
	let isPositioned = $state(false);

	function position() {
		const triggerNode = rootState.activeTrigger?.node;
		if (!triggerNode || !ref) return;
		const triggerRect = triggerNode.getBoundingClientRect();
		const contentRect = ref.getBoundingClientRect();
		const result = computeTooltipPosition({
			triggerRect,
			contentWidth: contentRect.width,
			contentHeight: contentRect.height,
			side,
			sideOffset,
			align,
			alignOffset,
			avoidCollisions,
			collisionPadding,
			scrollX: window.scrollX,
			scrollY: window.scrollY,
			viewportWidth: window.innerWidth,
			viewportHeight: window.innerHeight
		});
		x = result.x;
		y = result.y;
		placedSide = result.side;
		isPositioned = true;
	}

	$effect(() => {
		rootState.setContent(id, ref);
		if (rootState.open && ref) {
			isPositioned = false;
			position();
		}
	});

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		id,
		tabindex: '-1',
		'data-state': rootState.stateAttr,
		'data-side': placedSide,
		'data-align': align,
		'data-disabled': rootState.disabled ? '' : undefined,
		style: [
			'position:absolute',
			`left:${x}px`,
			`top:${y}px`,
			isPositioned ? undefined : 'visibility:hidden',
			'outline:none',
			typeof style === 'string' ? style : undefined
		]
			.filter(Boolean)
			.join(';')
	});
</script>

{#if child}
	{@render child({ props: mergedProps })}
{:else}
	<div {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.({ open: rootState.open })}
	</div>
{/if}
