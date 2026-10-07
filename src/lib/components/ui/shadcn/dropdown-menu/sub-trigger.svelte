<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		DropdownSubState,
		nextItemId,
		registerItem,
		unregisterItem,
		useDropdownMenu,
		useDropdownSub,
		type DropdownSubTriggerProps
	} from './dropdown-menu-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		disabled = false,
		id = `ddm-sub-trigger-${uid}`,
		children,
		...rest
	}: DropdownSubTriggerProps = $props();

	// the sub this trigger belongs to, and the outer menu for highlight
	const sub = useDropdownSub();
	const parentMenu = sub.parent!;

	const itemId = nextItemId();

	function isDisabled() {
		return disabled;
	}

	// the outside-click guard needs the sub trigger node even before content
	// mounts (otherwise the pointerdown that opens the sub closes it again)
	$effect(() => {
		if (ref) sub.triggerNode = ref;
	});

	$effect(() => {
		registerItem({
			id: itemId,
			node: ref,
			menuId: parentMenu.menuId,
			isDisabled,
			text: () => ref?.textContent ?? ''
		});
		return () => unregisterItem(itemId);
	});

	function openSub() {
		if (disabled) return;
		sub.hintedSide = 'right';
		if (!sub.open) sub.setOpen(true, 'trigger');
	}

	function onpointerenter() {
		if (disabled) return;
		// hovering a sub trigger closes sibling submenus (bits-ui parity)
		parentMenu.closeSiblingSubs(sub);
		openSub();
	}

	let childProps: Record<string, unknown> = $derived({
		...rest,
		id,
		role: 'menuitem',
		'aria-haspopup': 'menu',
		'aria-expanded': sub.open,
		'data-dropdown-menu-id': sub.menuId,
		tabindex: parentMenu.highlightedId === itemId ? '0' : '-1',
		'data-highlighted': parentMenu.highlightedId === itemId ? '' : undefined,
		'data-state': sub.open ? 'open' : 'closed',
		'data-disabled': disabled ? '' : undefined,
		class: mergeClass(className),
		onclick: openSub,
		onpointerenter,
		onfocusin: () => {
			parentMenu.highlightedId = itemId;
		},
		onpointermove: () => {
			parentMenu.highlightedId = itemId;
			ref?.focus();
		}
	});
</script>

{#if child}
	{@render child({ props: childProps })}
{:else}
	<div bind:this={ref} {...childProps}>{@render children?.()}</div>
{/if}
