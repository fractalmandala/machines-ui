<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		DropdownMenuState,
		nextItemId,
		registerItem,
		unregisterItem,
		useDropdownMenu,
		type DropdownItemProps
	} from './dropdown-menu-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		disabled = false,
		onSelect,
		id = `ddm-item-${uid}`,
		children,
		childrenArgs,
		...rest
	}: DropdownItemProps & { childrenArgs?: Record<string, unknown> } = $props();

	const menu = useDropdownMenu();

	const itemId = nextItemId();

	function isDisabled() {
		return disabled;
	}

	$effect(() => {
		registerItem({
			id: itemId,
			node: ref,
			menuId: menu.menuId,
			isDisabled,
			text: () => ref?.textContent ?? ''
		});
		return () => unregisterItem(itemId);
	});

	function select() {
		if (disabled) return;
		// the select event lets consumers keep the menu open via preventDefault
		const selectEvent = new MouseEvent('select', { bubbles: true, cancelable: true });
		onSelect?.(selectEvent);
		if (selectEvent.defaultPrevented) return;
		menu.closeSubs();
		menu.setOpen(false, 'select');
	}

	function onkeydown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.stopPropagation();
			select();
			return;
		}
		if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
			if (menu instanceof DropdownMenuState && menu.typeahead(event.key)) {
				event.preventDefault();
			}
		}
	}

	let childProps: Record<string, unknown> = $derived({
		...rest,
		id,
		role: 'menuitem',
		tabindex: menu.highlightedId === itemId ? '0' : '-1',
		'aria-disabled': disabled || undefined,
		'data-highlighted': menu.highlightedId === itemId ? '' : undefined,
		'data-disabled': disabled ? '' : undefined,
		'data-orientation': 'vertical',
		class: mergeClass(className),
		onclick: select,
		onkeydown,
		onfocusin: () => {
			menu.highlightedId = itemId;
		},
		onpointermove: () => {
			menu.highlightedId = itemId;
			ref?.focus();
		},
		onpointerleave: () => {
			if (menu.highlightedId === itemId) menu.highlightedId = null;
		}
	});
</script>

{#if child}
	{@render child({ props: childProps })}
{:else}
	<div bind:this={ref} {...childProps}>
		{@render children?.(childrenArgs ?? {})}
	</div>
{/if}
