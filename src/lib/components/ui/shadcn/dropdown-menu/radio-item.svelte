<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		DropdownGroupState,
		nextItemId,
		registerItem,
		unregisterItem,
		useDropdownMenu,
		useGroup,
		type DropdownItemProps
	} from './dropdown-menu-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		disabled = false,
		value,
		onSelect,
		id = `ddm-radio-item-${uid}`,
		children,
		...rest
	}: DropdownItemProps & { value?: string } = $props();

	const menu = useDropdownMenu();
	const group = useGroup<string>();

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

	const isChecked = $derived(group !== undefined && group.value === value);

	function select() {
		if (disabled) return;
		const selectEvent = new MouseEvent('select', { bubbles: true, cancelable: true });
		onSelect?.(selectEvent);
		if (group && value !== undefined) {
			group.value = value;
			group.onValueChange?.(value);
		}
		if (selectEvent.defaultPrevented) return;
		menu.closeSubs();
		menu.setOpen(false, 'select');
	}

	let childProps: Record<string, unknown> = $derived({
		...rest,
		id,
		role: 'menuitemradio',
		'aria-checked': isChecked,
		tabindex: menu.highlightedId === itemId ? '0' : '-1',
		'data-highlighted': menu.highlightedId === itemId ? '' : undefined,
		'data-disabled': disabled ? '' : undefined,
		'data-state': isChecked ? 'checked' : 'unchecked',
		class: mergeClass(className),
		onclick: select,
		onkeydown: (event: KeyboardEvent) => {
			if (disabled) return;
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				event.stopPropagation();
				select();
			}
		},
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
		{@render children?.({ checked: isChecked })}
	</div>
{/if}
