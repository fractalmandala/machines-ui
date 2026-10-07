<script lang="ts">
	import { tick, untrack } from 'svelte';
	import Portal from './portal.svelte';
	import { mergeClass } from '$lib/utils/class.js';
	import { computeFloatingPosition, type Side } from '../floating.svelte.js';
	import {
		EXIT_MS,
		itemsOfMenu,
		useDropdownMenu,
		useDropdownSub,
		type DropdownContentProps
	} from './dropdown-menu-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		sideOffset = 4,
		align = 'start',
		alignOffset = 0,
		avoidCollisions = true,
		collisionPadding = 0,
		forceMount = false,
		id = `ddm-sub-content-${uid}`,
		style,
		loop = false,
		children,
		...rest
	}: DropdownContentProps = $props();

	const sub = useDropdownSub();

	// presence: unmount only after the exit animation has played
	let present = $state(sub.open);
	let x = $state(0);
	let y = $state(0);
	let placedSide = $state('right');
	let isPositioned = $state(false);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;
	let closeSeq = 0;

	let el = $state<HTMLElement | null>(null);

	$effect(() => {
		sub.contentNode = el;
		ref = el;
	});

	function position() {
		const trigger = sub.triggerNode;
		if (!trigger || !el) return;
		const triggerRect = trigger.getBoundingClientRect();
		const elRect = el.getBoundingClientRect();
		const desiredSide = 'right' as const;
		let side: Side = desiredSide;
		if (avoidCollisions) {
			// flip to the left when the submenu would overflow the right edge
			const fitsRight =
				triggerRect.right + sideOffset + elRect.width <=
				window.scrollX + window.innerWidth - collisionPadding;
			if (!fitsRight) side = 'left';
		}
		const result = computeFloatingPosition({
			triggerRect,
			contentWidth: elRect.width || 1,
			contentHeight: elRect.height || 1,
			side,
			sideOffset,
			align: align as never,
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
		return itemsOfMenu(sub.menuId)
			.map((item) => item.node)
			.filter((node): node is HTMLElement => !!node);
	}

	function onContentKeydown(event: KeyboardEvent) {
		if (!sub.open) return;
		const items = menuItemNodes();
		const activeIndex = items.indexOf(document.activeElement as HTMLElement);
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			const next = activeIndex < 0 ? 0 : activeIndex + 1;
			if (next < items.length) items[next].focus();
			else if (loop) items[0].focus();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			event.stopPropagation();
			const next = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
			items[next]?.focus();
		} else if (event.key === 'ArrowLeft') {
			// close the submenu and refill focus to its trigger
			event.preventDefault();
			event.stopPropagation();
			sub.setOpen(false);
			sub.triggerNode?.focus();
		} else if (event.key === 'Home') {
			event.preventDefault();
			items[0]?.focus();
		} else if (event.key === 'End') {
			event.preventDefault();
			items[items.length - 1]?.focus();
		}
	}

	function onDocFocusIn(event: FocusEvent) {
		if (!sub.open) return;
		const target = event.target as Node | null;
		const trigger = sub.triggerNode;
		const insideContent = target && el && el.contains(target);
		const insideTrigger = target && trigger && trigger.contains(target);
		if (!insideContent && !insideTrigger) {
			sub.setOpen(false, 'focus-out');
		}
	}

	function openSub() {
		present = true;
		void tick().then(() => {
			if (!sub.open) return;
			position();
			el?.focus({ preventScroll: true });
		});
		document.addEventListener('focusin', onDocFocusIn, true);
	}

	function closeSub() {
		document.removeEventListener('focusin', onDocFocusIn, true);
		if (sub.forceMount) {
			present = false;
			return;
		}
		const seq = ++closeSeq;
		closeTimer = setTimeout(() => {
			if (seq === closeSeq) present = false;
		}, EXIT_MS);
	}

	$effect(() => {
		const isOpen = sub.open;
		clearTimeout(closeTimer);
		untrack(() => (isOpen ? openSub() : closeSub()));
	});

	$effect(() => {
		if (sub.open && el) {
			position();
		}
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
		'data-state': sub.open ? 'open' : 'closed',
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
	<Portal>
		<div bind:this={el} {...mergedProps}>
			{@render children?.({ open: sub.open })}
		</div>
	</Portal>
{/if}

<svelte:window
	onresize={() => sub.open && position()}
	onscroll={() => sub.open && position()}
/>
