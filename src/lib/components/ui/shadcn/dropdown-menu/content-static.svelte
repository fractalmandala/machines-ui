<script lang="ts">
	import { tick, untrack } from 'svelte';
		import { mergeClass } from '$lib/utils/class.js';
	import { computeFloatingPosition } from '../floating.svelte.js';
	import {
		EXIT_MS,
		itemsOfMenu,
		useDropdownMenu,
		type DropdownContentProps
	} from './dropdown-menu-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		side: sideProp = 'bottom',
		sideOffset = 6,
		align = 'start',
		alignOffset = 0,
		avoidCollisions = true,
		collisionPadding = 0,
		forceMount = false,
		id = `ddm-content-${uid}`,
		style,
		loop = false,
		onCloseAutoFocus,
		onEscapeKeyDown,
		onInteractOutside,
		children,
		...rest
	}: DropdownContentProps = $props();

	const menu = useDropdownMenu();

	// presence: unmount only after the exit animation has played
	let present = $state(menu.open);
	let x = $state(0);
	let y = $state(0);
	const initialSide = sideProp;
	let placedSide = $state(initialSide);
	let isPositioned = $state(false);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let closeSeq = 0;

	let el = $state<HTMLElement | null>(null);

	$effect(() => {
		menu.contentNode = el;
		ref = el;
	});

	function position() {
		const trigger = menu.triggerNode;
		if (!trigger || !el) return;
		const triggerRect = trigger.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const result = computeFloatingPosition({
			triggerRect,
			contentWidth: elRect.width || 1,
			contentHeight: elRect.height || 1,
			side: sideProp,
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

	function menuItemNodes(): HTMLElement[] {
		return itemsOfMenu(menu.menuId)
			.map((item) => item.node)
			.filter((node): node is HTMLElement => !!node);
	}

	function onContentKeydown(event: KeyboardEvent) {
		if (!menu.open) return;
		const items = menuItemNodes();
		const activeIndex = items.indexOf(document.activeElement as HTMLElement);
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			if (activeIndex < 0) {
				(items[0] ?? el)?.focus();
			} else if (activeIndex < items.length - 1) {
				items[activeIndex + 1].focus();
			} else if (loop) {
				items[0].focus();
			}
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			if (activeIndex < 0) {
				(items[items.length - 1] ?? el)?.focus();
			} else if (activeIndex > 0) {
				items[activeIndex - 1].focus();
			} else if (loop) {
				items[items.length - 1].focus();
			} else {
				items[items.length - 1]?.focus();
			}
		} else if (event.key === 'Home') {
			event.preventDefault();
			items[0]?.focus();
		} else if (event.key === 'End') {
			event.preventDefault();
			items[items.length - 1]?.focus();
		}
	}

	function onDocFocusIn(event: FocusEvent) {
		if (!menu.open) return;
		const target = event.target as Node | null;
		const trigger = menu.triggerNode;
		const insideContent = target && el && el.contains(target);
		const insideTrigger = target && trigger && trigger.contains(target);
		if (!insideContent && !insideTrigger) {
			menu.setOpen(false, 'focus-out');
		}
	}

	function removeGlobalListeners() {
		document.removeEventListener('focusin', onDocFocusIn, true);
	}

	function openMenu() {
		present = true;
		void tick().then(() => {
			if (!menu.open) return;
			position();
			const pending = menu.pendingItemFocus;
			if (pending === 'first') menu.focusFirstItem();
			else if (pending === 'last') menu.focusLastItem();
			else el?.focus({ preventScroll: true });
			menu.pendingItemFocus = null;
		});
		document.addEventListener('focusin', onDocFocusIn, true);
	}

	function closeMenu() {
		document.removeEventListener('focusin', onDocFocusIn, true);
		const seq = ++closeSeq;
		if (menu.forceMount) {
			present = false;
			return;
		}
		// keep the content mounted until its exit animation finishes; the
		// animationend observer below closes early when nothing animates
		closeTimer = setTimeout(() => {
			if (seq === closeSeq) present = false;
		}, EXIT_MS);
	}

	$effect(() => {
		const isOpen = menu.open;
		clearTimeout(closeTimer);
		untrack(() => (isOpen ? openMenu() : closeMenu()));
	});

	// position once the element is available and on trigger changes
	$effect(() => {
		if (menu.open && el) {
			position();
		}
	});

	$effect(() => {
		if (forceMount) menu.forceMount = true;
		return () => {
			menu.forceMount = false;
		};
	});

	let mergedStyle = $derived(
		[
			'position:absolute',
			`left:${x}px`,
			`top:${y}px`,
			isPositioned ? undefined : 'visibility:hidden',
			'min-width:max-content',
			typeof style === 'string' ? style : undefined
		]
			.filter(Boolean)
			.join(';')
	);

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		id,
		role: 'menu',
		tabindex: '-1',
		'aria-activedescendant': menu.highlightedId ?? undefined,
		'data-state': menu.open ? 'open' : 'closed',
		'data-side': placedSide,
		'data-align': align,
		class: mergeClass(className),
		onkeydown: onContentKeydown,
		style: mergedStyle
	});

	$effect(() => {
		return () => {
			clearTimeout(closeTimer);
			document.removeEventListener('focusin', onDocFocusIn, true);
		};
	});
</script>

{#if present || forceMount}
	<div bind:this={el} {...mergedProps}>
		{@render children?.({ open: menu.open })}
	</div>
{/if}

<svelte:window
	onresize={() => menu.open && position()}
	onscroll={() => menu.open && position()}
/>
