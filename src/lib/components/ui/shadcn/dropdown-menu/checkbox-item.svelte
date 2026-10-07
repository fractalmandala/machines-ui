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
		checked = $bindable(false),
		indeterminate = $bindable(false),
		onCheckedChange,
		onSelect,
		id = `ddm-radio-item-${uid}`,
		children,
		...rest
	}: DropdownItemProps & { checked?: boolean; onCheckedChange?: (checked: boolean) => void } =
		$props();

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

	function toggle() {
		if (disabled) return;
		checked = !checked;
		onCheckedChange?.(checked);
	}

	function select() {
		if (disabled) return;
		const selectEvent = new MouseEvent('select', { bubbles: true, cancelable: true });
		onSelect?.(selectEvent);
		toggle();
		if (selectEvent.defaultPrevented) return;
		menu.closeSubs();
		menu.setOpen(false, 'select');
	}

	let childProps: Record<string, unknown> = $derived({
		...rest,
		id,
		role: 'menuitemcheckbox',
		'aria-checked': checked ? 'true' : 'false',
		tabindex: menu.highlightedId === itemId ? '0' : '-1',
		'data-highlighted': menu.highlightedId === itemId ? '' : undefined,
		'data-disabled': disabled ? '' : undefined,
		'data-state': checked ? 'checked' : 'unchecked',
		class: mergeClass(className),
		onclick: () => {
			select();
		},
		onkeydown: (event: KeyboardEvent) => {
			if (disabled) return;
			if (event.key === 'Enter' || event.key === ' ') {
				event.preventDefault();
				event.stopPropagation();
				toggle();
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
		{@render children?.({ checked })}
	</div>
{/if}
