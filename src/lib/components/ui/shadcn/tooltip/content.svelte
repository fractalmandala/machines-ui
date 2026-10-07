<script lang="ts">
	import { onDestroy } from 'svelte';
	import { mergeClass } from '$lib/utils/class.js';
	import {
		computeTooltipPosition,
		getTooltipRoot,
		waitForTooltipAnimations,
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
		forceMount = false,
		id = `tooltip-content-${uid}`,
		style,
		children,
		...rest
	}: TooltipContentProps = $props();

	const rootState = getTooltipRoot();

	// presence: unmount only after the exit animation has played
	let present = $state(rootState.open);
	let closeSequence = 0;

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
		// anchor the arrow at the center of the trigger on the placed side
		// (assumes the default 8px arrow; relative to the content box)
		const centerX = triggerRect.left + window.scrollX + triggerRect.width / 2;
		const centerY = triggerRect.top + window.scrollY + triggerRect.height / 2;
		rootState.setArrow(
			result.side === 'top' || result.side === 'bottom'
				? { x: centerX - result.x - 4, y: 0, side: result.side }
				: { x: 0, y: centerY - result.y - 4, side: result.side }
		);
	}

	$effect.pre(() => {
		if (rootState.open) present = true;
	});

	$effect(() => {
		rootState.setContent(id, ref);
		const isOpen = rootState.open;
		// re-position when placement inputs change while open
		side;
		sideOffset;
		align;
		alignOffset;
		let cancelled = false;
		let removeResize: (() => void) | null = null;
		if (isOpen && ref) {
			isPositioned = false;
			position();
			const onResize = () => position();
			window.addEventListener('resize', onResize);
			removeResize = () => window.removeEventListener('resize', onResize);
			closeSequence += 1;
		} else if (!forceMount) {
			if (!ref) {
				present = false;
			} else {
				const sequence = ++closeSequence;
				waitForTooltipAnimations(ref).then(() => {
					if (cancelled || sequence !== closeSequence) return;
					if (rootState.open) return;
					present = false;
				});
			}
		}
		return () => {
			cancelled = true;
			removeResize?.();
		};
	});

	onDestroy(() => {
		rootState.setContent(undefined, null);
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
			rootState.disableHoverableContent ? 'pointer-events:none' : undefined,
			typeof style === 'string' ? style : undefined
		]
			.filter(Boolean)
			.join(';'),
		onpointerenter: () => rootState.onContentEnter(),
		onpointerleave: () => rootState.onContentLeave()
	});
</script>

{#if present}
	{#if child}
		{@render child({ props: mergedProps })}
	{:else}
		<div {...mergedProps} bind:this={ref} class={mergeClass(className)}>
			{@render children?.({ open: rootState.open })}
		</div>
	{/if}
{/if}
