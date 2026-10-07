<script lang="ts">
	import { tick, untrack } from 'svelte';
	import Portal from './portal.svelte';
	import { dialogClosed, dialogOpened, topDialog, useDialog } from './dialog-state.svelte.js';
	import type { DialogContentProps } from './types.js';

	let {
		ref = $bindable(null),
		children,
		id,
		style: styleProp,
		'aria-describedby': ariaDescribedby,
		...rest
	}: DialogContentProps = $props();

	const dialog = useDialog();
	if (id) dialog.contentId = id;

	const EXIT_MS = 300;

	let el = $state<HTMLElement | null>(null);
	let present = $state(false);
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		dialog.contentEl = el;
		ref = el;
	});

	function focusableEls(): HTMLElement[] {
		const root = el;
		if (!root) return [];
		return [
			...root.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
			)
		].filter((item) => !item.hasAttribute('disabled'));
	}

	function focusFirst() {
		const els = focusableEls();
		if (els.length > 0) els[0].focus();
		else el?.focus();
	}

	function onDocKeydown(event: KeyboardEvent) {
		if (!dialog.open || topDialog() !== dialog) return;
		if (event.key === 'Escape') {
			event.preventDefault();
			dialog.setOpen(false);
			return;
		}
		if (event.key !== 'Tab') return;
		const els = focusableEls();
		if (els.length === 0) {
			event.preventDefault();
			el?.focus();
			return;
		}
		const first = els[0];
		const last = els[els.length - 1];
		const active = document.activeElement;
		if (event.shiftKey) {
			if (active === first || !el?.contains(active)) {
				event.preventDefault();
				last.focus();
			}
		} else if (active === last || !el?.contains(active)) {
			event.preventDefault();
			first.focus();
		}
	}

	function onDocFocusIn(event: FocusEvent) {
		if (!dialog.open || topDialog() !== dialog) return;
		const target = event.target as Node | null;
		if (target && el && !el.contains(target)) focusFirst();
	}

	function removeListeners() {
		document.removeEventListener('keydown', onDocKeydown, true);
		document.removeEventListener('focusin', onDocFocusIn, true);
	}

	function openDialog() {
		present = true;
		untrack(() => dialogOpened(dialog));
		void tick().then(() => {
			if (!dialog.open) return;
			focusFirst();
		});
		document.addEventListener('keydown', onDocKeydown, true);
		document.addEventListener('focusin', onDocFocusIn, true);
	}

	function closeDialog() {
		removeListeners();
		untrack(() => dialogClosed(dialog));
		closeTimer = setTimeout(() => {
			present = false;
		}, EXIT_MS);
		const restore = dialog.restoreEl;
		if (restore && restore.isConnected && restore instanceof HTMLElement) {
			restore.focus();
		}
	}

	$effect(() => {
		const isOpen = dialog.open;
		clearTimeout(closeTimer);
		untrack(() => (isOpen ? openDialog() : closeDialog()));
	});

	let style = $derived(['pointer-events: auto', styleProp].filter(Boolean).join('; '));
</script>

{#if present}
	<Portal>
		<div
			bind:this={el}
			id={dialog.contentId}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			data-state={dialog.open ? 'open' : 'closed'}
			data-dialog-content=""
			aria-labelledby={dialog.titleId}
			aria-describedby={ariaDescribedby ?? dialog.descriptionId}
			{style}
			{...rest}
		>
			{@render children?.()}
		</div>
	</Portal>
{/if}
