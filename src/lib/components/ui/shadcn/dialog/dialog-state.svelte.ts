import { getContext, setContext } from 'svelte';

let uid = 0;
export function dialogId(prefix: string): string {
	return `${prefix}-${(++uid).toString(36)}`;
}

/**
 * Self-sufficient Dialog state, ported from the fs-basics ModalDialog/DialogContent
 * zero-dependency approach: the root owns the open flag, the content renders
 * role="dialog" + aria-modal and manages Esc/overlay close, focus capture and
 * body scroll locking.
 */
export class DialogState {
	open = $state(false);
	onOpenChange?: ((open: boolean) => void) | undefined;
	triggerEl = $state<HTMLElement | null>(null);
	contentEl = $state<HTMLElement | null>(null);
	contentId = dialogId('dialog-content');
	titleId = $state<string | undefined>(undefined);
	descriptionId = $state<string | undefined>(undefined);
	/** Element to return focus to on close (recorded at open time). */
	restoreEl: Element | null = null;

	setOpen(value: boolean) {
		if (this.open === value) return;
		this.open = value;
		this.onOpenChange?.(value);
	}
}

const DIALOG_KEY = Symbol('shadcn-dialog');

export function provideDialog(state: DialogState): DialogState {
	setContext(DIALOG_KEY, state);
	return state;
}

export function useDialog(): DialogState {
	return getContext(DIALOG_KEY) as DialogState;
}

/* ---- stack for Escape ordering + shared body scroll lock ---- */

const stack: DialogState[] = [];
let lockCount = 0;
let savedOverflow = '';
let savedPointerEvents = '';

export function dialogOpened(state: DialogState) {
	stack.push(state);
	lockCount += 1;
	if (lockCount === 1) {
		savedOverflow = document.body.style.overflow;
		savedPointerEvents = document.body.style.pointerEvents;
		document.body.style.overflow = 'hidden';
		document.body.style.pointerEvents = 'none';
	}
}

export function dialogClosed(state: DialogState) {
	const index = stack.indexOf(state);
	if (index !== -1) stack.splice(index, 1);
	lockCount = Math.max(0, lockCount - 1);
	if (lockCount === 0) {
		document.body.style.overflow = savedOverflow;
		document.body.style.pointerEvents = savedPointerEvents;
	}
}

export function topDialog(): DialogState | undefined {
	return stack[stack.length - 1];
}
