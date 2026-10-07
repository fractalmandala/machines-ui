<script lang="ts">
	import { createAttachmentKey } from 'svelte/attachments';
	import { mergeClass } from '$lib/utils/class.js';
	import { getTooltipRoot, type TooltipTriggerProps } from './tooltip-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		disabled = false,
		id = `tooltip-trigger-${uid}`,
		children,
		...rest
	}: TooltipTriggerProps = $props();

	const rootState = getTooltipRoot();

	let isPointerDown = false;

	$effect(() => {
		rootState.registerTrigger({ id, node: ref });
		return () => rootState.unregisterTrigger(id);
	});

	function handlePointerdown() {
		if (isDisabled()) return;
		// close on pointerdown regardless of button so right/middle click
		// dismisses the tooltip too (bits-ui parity)
		if (!rootState.disableCloseOnTriggerClick) {
			if (rootState.open) rootState.handleClose();
			else rootState.cancelPendingOpen();
		}
		isPointerDown = true;
		const pointerUp = () => {
			isPointerDown = false;
			document.removeEventListener('pointerup', pointerUp);
		};
		document.addEventListener('pointerup', pointerUp);
	}

	function isDisabled() {
		return disabled || rootState.disabled;
	}

	function handlePointerenter(event: PointerEvent) {
		if (isDisabled()) {
			if (rootState.open) rootState.handleClose();
			return;
		}
		if (event.pointerType === 'touch') return;
		rootState.onTriggerEnter(id, ref);
	}

	function handlePointermove(event: PointerEvent) {
		if (isDisabled()) {
			if (rootState.open) rootState.handleClose();
			return;
		}
		if (event.pointerType === 'touch') return;
		if (rootState.open) return;
		rootState.onTriggerEnter(id, ref);
	}

	function handlePointerleave(event: PointerEvent) {
		if (isDisabled()) return;
		const related = event.relatedTarget;
		// moving to a sibling trigger: keep open — the sibling's enter handler
		// switches the active trigger instantly (skip-delay behavior)
		if (related instanceof Node && rootState.isTriggerNode(related) && related !== ref) {
			return;
		}
		rootState.onTriggerLeave();
	}

	function handleFocus() {
		if (isPointerDown) return;
		if (isDisabled()) {
			if (rootState.open) rootState.handleClose();
			return;
		}
		rootState.setActiveTrigger({ id, node: ref });
		rootState.handleOpen();
	}

	function handleBlur() {
		if (isDisabled()) return;
		rootState.handleClose();
	}

	function handleClick() {
		if (rootState.disableCloseOnTriggerClick || isDisabled()) return;
		rootState.handleClose();
	}

	let isOpenForThisTrigger = $derived(
		rootState.open && rootState.activeTrigger?.id === id
	);

	// With a `child` snippet the consumer renders the element, so `bind:this`
	// is out of reach: hand it an attachment that captures the node instead.
	// Without the node the tooltip cannot be positioned and never shows.
	// The function must keep one identity: a new one per derive would detach and
	// re-attach, flipping `ref` and re-running the registration effect, whose
	// teardown unregisters the trigger and closes the tooltip.
	const attachKey = createAttachmentKey();
	const captureNode = (node: HTMLElement) => {
		ref = node;

		return () => {
			if (ref === node) ref = null;
		};
	};

	let mergedProps: Record<string | symbol, unknown> = $derived({
		...rest,
		[attachKey]: captureNode,
		id,
		disabled: isDisabled() || undefined,
		'aria-describedby': isOpenForThisTrigger ? rootState.contentId : undefined,
		'data-state': isOpenForThisTrigger ? rootState.stateAttr : 'closed',
		'data-disabled': isDisabled() ? '' : undefined,
		'data-delay-duration': `${rootState.delayDuration}`,
		onpointerdown: handlePointerdown,
		onpointerenter: handlePointerenter,
		onpointermove: handlePointermove,
		onpointerleave: handlePointerleave,
		onfocus: handleFocus,
		onblur: handleBlur,
		onclick: handleClick
	});
</script>

{#if child}
	{@render child({ props: mergedProps })}
{:else}
	<button {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.()}
	</button>
{/if}
