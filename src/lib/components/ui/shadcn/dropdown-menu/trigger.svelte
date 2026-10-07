<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		useDropdownMenu,
		type DropdownTriggerProps
	} from './dropdown-menu-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		disabled = false,
		id = `ddm-trigger-${uid}`,
		children,
		...rest
	}: DropdownTriggerProps = $props();

	const menu = useDropdownMenu();

	$effect(() => {
		menu.triggerNode = ref;
	});

	function onclick() {
		if (disabled || menu.disabled) return;
		menu.restoreEl = document.activeElement;
		menu.toggleOpen('trigger');
	}

	function onkeydown(event: KeyboardEvent) {
		if (disabled) return;
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			// ArrowDown opens and focuses the first item, ArrowUp the last
			// (bits-ui parity); content honors pendingItemFocus after mount
			event.preventDefault();
			menu.pendingItemFocus = event.key === 'ArrowDown' ? 'first' : 'last';
			if (!menu.open) {
				menu.restoreEl = document.activeElement;
				menu.setOpen(true, 'trigger');
			} else {
				menu.pendingItemFocus === 'first' ? menu.focusFirstItem() : menu.focusLastItem();
			}
			return;
		}
		if (event.key === 'Enter' || event.key === ' ') {
			// Enter/Space just toggle; focus goes to the content wrapper
			event.preventDefault();
		}
	}

	let childProps: Record<string, unknown> = $derived({
		id,
		type: 'button',
		'aria-haspopup': 'menu',
		'aria-expanded': menu.open,
		'aria-controls': menu.open ? menu.contentNode?.id : undefined,
		'data-state': menu.open ? 'open' : 'closed',
		// lets Content find the trigger node even when it is rendered by a
		// child snippet (bind:this never reaches us in that case)
		'data-dropdown-menu-id': menu.menuId,
		'data-disabled': disabled ? '' : undefined,
		disabled: disabled || undefined,
		class: mergeClass(className),
		onclick,
		onkeydown,
		...rest
	});
</script>

{#if child}
	{@render child({ props: childProps })}
{:else}
	<button bind:this={ref} {...childProps}>{@render children?.()}</button>
{/if}
