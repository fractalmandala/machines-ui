/**
 * Self-sufficient Svelte 5 state for the DropdownMenu family (replaces bits-ui).
 *
 * Root owns open/close; content renders into a portal (floating.svelte.ts math,
 * the same placement the Tooltip family uses); items are a roving-tabindex
 * list with Arrow/Enter/Space/Home/End navigation and typeahead. Submenus nest
 * through a parent-chain context; their content positions against the sub
 * trigger and flips when it would overflow the viewport.
 *
 * bits-ui surface kept for the app's CSS and wrappers:
 * - data-state="open"|"closed", data-side/data-align on content
 * - data-highlighted on the focused item, data-disabled on disabled items
 * - item onSelect receiving the original MouseEvent (preventDefault to keep
 *   the menu open), radio/checkbox groups with onValueChange/onCheckedChange
 */
import { getContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';
import { computeFloatingPosition, type Align, type Rect, type Side } from '../floating.svelte.js';

export const DROPDOWN_ROOT_KEY = Symbol('dropdown-root');
export const DROPDOWN_SUB_KEY = Symbol('dropdown-sub');
export const DROPDOWN_GROUP_KEY = Symbol('dropdown-group');

export type DropdownSide = Side;
export type DropdownAlign = Align;
export type { Rect };
export type OpenChangeReason = 'trigger' | 'escape' | 'outside' | 'select' | 'focus-out';
export type { Align, Side };

/* ------------------------------------------------------------------ */
/* items: registered by Item components, keyed per menu                */
/* ------------------------------------------------------------------ */

export type RegisteredItem = {
	id: string;
	node: HTMLElement | null;
	menuId: string;
	isDisabled: () => boolean;
	text: () => string;
};

const itemRegistry = new Map<string, RegisteredItem>();
let itemSeq = 0;

export function nextItemId(): string {
	return `ddmi-${++itemSeq}`;
}

export function registerItem(item: RegisteredItem) {
	itemRegistry.set(item.id, item);
}

export function unregisterItem(id: string) {
	itemRegistry.delete(id);
}

/** Items of one menu in DOM order (collapsed disabled ones stay navigable). */
export function itemsOfMenu(menuId: string): RegisteredItem[] {
	const found: RegisteredItem[] = [];
	for (const item of itemRegistry.values()) {
		if (item.menuId === menuId && item.node?.isConnected) found.push(item);
	}
	return found.sort((a, b) => {
		if (!a.node || !b.node) return 0;
		const pos = a.node.compareDocumentPosition(b.node);
		return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
	});
}

/** Shared typeahead: first enabled item whose text starts with `token`. */
export function matchItemByToken(items: RegisteredItem[], token: string): RegisteredItem | null {
	const needle = token.toLowerCase();
	return (
		items.find(
			(item) => !item.isDisabled() && (item.text().toLowerCase().startsWith(needle) ?? false)
		) ?? null
	);
}

/* ------------------------------------------------------------------ */
/* open-menu registry: Escape ordering + shared outside-click handling */
/* ------------------------------------------------------------------ */

type StackEntry = {
	root: DropdownBase;
	contentEl: () => HTMLElement | null;
};

const menuStack: StackEntry[] = [];
let listenersInstalled = false;

function rootContains(entry: StackEntry, target: Node | null): boolean {
	if (!target) return false;
	const trigger = entry.root.triggerNode;
	if (trigger && trigger.contains(target)) return true;
	const content = entry.contentEl();
	return content?.contains(target) ?? false;
}

function onDocPointerdown(event: Event) {
	// close every open menu that the pointer did not land in
	for (const entry of [...menuStack].reverse()) {
		if (!entry.root.open) continue;
		if (!rootContains(entry, event.target as Node)) entry.root.setOpen(false, 'outside');
	}
}

function onDocKeydown(event: KeyboardEvent) {
	const top = menuStack[menuStack.length - 1];
	if (!top || !top.root.open) return;
	if (event.key === 'Escape') {
		event.preventDefault();
		top.root.setOpen(false, 'escape');
	} else if (event.key === 'Tab') {
		// leaving the menu with Tab closes it; focus moves on naturally
		top.root.setOpen(false, 'focus-out');
	}
}

function installListeners() {
	if (listenersInstalled) return;
	listenersInstalled = true;
	document.addEventListener('pointerdown', onDocPointerdown, true);
	document.addEventListener('keydown', onDocKeydown);
}

function uninstallListenersIfIdle() {
	if (menuStack.length > 0 || !listenersInstalled) return;
	listenersInstalled = false;
	document.removeEventListener('pointerdown', onDocPointerdown, true);
	document.removeEventListener('keydown', onDocKeydown);
}

function pushMenuEntry(entry: StackEntry) {
	const existing = menuStack.indexOf(entry);
	if (existing !== -1) menuStack.splice(existing, 1);
	menuStack.push(entry);
	installListeners();
}

function removeMenuEntry(entry: StackEntry) {
	const index = menuStack.indexOf(entry);
	if (index !== -1) menuStack.splice(index, 1);
	uninstallListenersIfIdle();
}

/** The topmost open menu, for stacking-sensitive behavior (Escape etc.). */
export function topMenu(): DropdownBase | null {
	return menuStack[menuStack.length - 1]?.root ?? null;
}

/* ------------------------------------------------------------------ */
/* base state shared by Root and Sub                                   */
/* ------------------------------------------------------------------ */

/** How long content stays mounted while its exit animation plays. */
export const EXIT_MS = 150;

export abstract class DropdownBase {
	/** Stable id shared by all items of this menu. */
	abstract readonly menuId: string;

	open = $state(false);
	/** Focused item id (roving tabindex follows the highlight). */
	highlightedId = $state<string | null>(null);
	onOpenChange: ((open: boolean, reason?: OpenChangeReason) => void) | undefined;
	/** Trigger element — outside-click affinity + submenu placement anchor. */
	triggerNode = $state<HTMLElement | null>(null);
	/** Content element once mounted (inside the portal). */
	contentNode = $state<HTMLElement | null>(null);
	/** Element to restore focus to on close (recorded by the trigger). */
	restoreEl: Element | null = null;
	/** Parent chain for subs; null for the root menu. */
	parent: DropdownBase | null = null;
	/** Submenus opened from this menu (closed when a sibling item is hovered). */
	openedSubs = new Set<DropdownBase>();
	/** Force-mount content (skip unmount after exit animation). */
	forceMount = false;
	disabled = false;
/** Set while the exit animation unwinds after close. */
	closing = $state(false);
	closeTimer: ReturnType<typeof setTimeout> | undefined;
	entry: StackEntry | null = null;
	/** Content focuses the first/last item on open (ArrowUp/ArrowDown trigger). */
	pendingItemFocus: 'first' | 'last' | null = null;

	setOpen(value: boolean, reason?: OpenChangeReason) {
		if (this.open === value) return;
		if (this.disabled && value) return;
		this.open = value;
		if (value) {
			this.closing = false;
			this.entry = { root: this, contentEl: () => this.contentNode };
			pushMenuEntry(this.entry);
			if (this.parent) this.parent.openedSubs.add(this);
			// opening a sub closes sibling subs of the same parent
			if (this.parent) this.closeSiblingSubs(this);
		} else {
			this.closing = true;
			this.closeSubs();
			if (this.entry) {
				removeMenuEntry(this.entry);
				this.entry = null;
			}
			if (this.parent) this.parent.openedSubs.delete(this);
			this.clearCloseTimer();
			this.closeTimer = setTimeout(() => {
				this.closing = false;
			}, EXIT_MS);
		}
		const cb = this.onOpenChange;
		if (cb) cb(value, reason);
	}

	toggleOpen(reason: OpenChangeReason = 'trigger') {
		this.setOpen(!this.open, reason);
	}

	/** Close nested submenus opened from this menu. */
	closeSubs() {
		for (const sub of [...this.openedSubs]) sub.setOpen(false);
	}

	closeSiblingSubs(except: DropdownBase) {
		for (const sub of [...this.openedSubs]) {
			if (sub !== except) sub.setOpen(false);
		}
	}

	itemList(): RegisteredItem[] {
		return itemsOfMenu(this.menuId);
	}

	focusFirstItem() {
		const items = this.itemList();
		const target = items.find((item) => !item.isDisabled()) ?? null;
		if (target?.node) target.node.focus();
		else this.contentNode?.focus();
	}

	focusLastItem() {
		const items = this.itemList().reverse();
		const target = items.find((item) => !item.isDisabled()) ?? null;
		if (target?.node) target.node.focus();
		else this.contentNode?.focus();
	}

	clearCloseTimer() {
		if (this.closeTimer !== undefined) {
			clearTimeout(this.closeTimer);
			this.closeTimer = undefined;
		}
	}

	/** Placement hint for content, resolved by the trigger's viewport position. */
	preferredSide(): DropdownSide {
		const trigger = this.triggerNode;
		if (!trigger || typeof window === 'undefined') return 'bottom';
		const rect = trigger.getBoundingClientRect();
		const vh = window.innerHeight;
		return rect.top > vh / 2 ? 'top' : 'bottom';
	}
}

/* ------------------------------------------------------------------ */
/* root + sub state                                                    */
/* ------------------------------------------------------------------ */

let menuSeq = 0;

export class DropdownMenuState extends DropdownBase {
	readonly menuId = `ddm-${++menuSeq}`;
	typeaheadBuffer = '';
	typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		super();
		$effect.pre(() => {
			if (this.open) this.highlightedId = null;
		});
	}

	/** Append to the typeahead buffer and focus the first match. */
	typeahead(char: string): boolean {
		this.clearTypeaheadTimer();
		this.typeaheadBuffer += char.toLowerCase();
		this.typeaheadTimer = setTimeout(() => {
			this.typeaheadBuffer = '';
		}, 500);
		const match = matchItemByToken(this.itemList(), this.typeaheadBuffer);
		if (match) {
			this.highlightedId = match.id;
			match.node?.focus();
			return true;
		}
		// no match: reset the buffer so the next key starts fresh
		this.typeaheadBuffer = '';
		return false;
	}

	clearTypeaheadTimer() {
		if (this.typeaheadTimer !== undefined) {
			clearTimeout(this.typeaheadTimer);
			this.typeaheadTimer = undefined;
		}
		this.typeaheadBuffer = '';
	}
}

export class DropdownSubState extends DropdownBase {
	readonly menuId = `dds-${++menuSeq}`;
	/** Side the content should open on (default: away from the trigger edge). */
	hintedSide: DropdownSide = 'right';
	/** Cross-axis alignment for sub content (default matches bits-ui). */
	hintedAlign: DropdownAlign = 'start';

	constructor(parent: DropdownBase) {
		super();
		this.parent = parent;
	}
}

const ROOT_CONTEXT = Symbol('dropdown-menu-root');
const SUB_CONTEXT = Symbol('dropdown-menu-sub');
/** Set by Sub for its own content/trigger, distinct from the "nearest menu". */
const CURRENT_CONTEXT = Symbol('dropdown-menu-current');

export function provideDropdownRoot(state: DropdownMenuState): DropdownMenuState {
	setContext(ROOT_CONTEXT, state);
	setContext(SUB_CONTEXT, state);
	return state;
}

export function provideDropdownSub(state: DropdownSubState): DropdownSubState {
	setContext(SUB_CONTEXT, state);
	setContext(CURRENT_CONTEXT, state);
	return state;
}

/** Nearest enclosing menu (root or sub). */
export function useDropdownMenu(): DropdownBase {
	const current = getContext<DropdownBase | undefined>(CURRENT_CONTEXT);
	if (current) return current;
	const menu = getContext<DropdownBase | undefined>(SUB_CONTEXT);
	if (!menu) {
		throw new Error('DropdownMenu parts must be used within a DropdownMenu.Root');
	}
	return menu;
}

/** The DropdownSubState a SubTrigger/SubContent belongs to. */
export function useDropdownSub(): DropdownSubState {
	const current = getContext<DropdownBase | undefined>(CURRENT_CONTEXT);
	if (current instanceof DropdownSubState) return current;
	throw new Error('DropdownMenu.Sub parts must be used within a DropdownMenu.Sub');
}

/** The root menu, even when nested inside submenus. */
export function useDropdownRoot(): DropdownMenuState {
	const menu = useDropdownMenu();
	let cursor: DropdownBase | null = menu;
	while (cursor) {
		if (cursor instanceof DropdownMenuState) return cursor;
		cursor = cursor.parent;
	}
	throw new Error('DropdownMenu parts must be used within a DropdownMenu.Root');
}

export function isDropdownRoot(state: DropdownBase): state is DropdownMenuState {
	return state instanceof DropdownMenuState;
}

/* ------------------------------------------------------------------ */
/* groups: radio + checkbox shared context                             */
/* ------------------------------------------------------------------ */

const GROUP_CONTEXT = Symbol('dropdown-menu-group');

export class DropdownGroupState<T = string> {
	value = $state<T>() as T;
	onValueChange?: ((value: T) => void) | undefined;
}

export function provideGroup<T>(state: DropdownGroupState<T>): DropdownGroupState<T> {
	return setContext(GROUP_CONTEXT, state) as DropdownGroupState<T>;
}

export function useGroup<T>(): DropdownGroupState<T> | undefined {
	return getContext<DropdownGroupState<T> | undefined>(GROUP_CONTEXT);
}

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

type ChildSnippet = Snippet<[{ props: Record<string, unknown> }]>;

export type DropdownRootProps = {
	open?: boolean;
	defaultOpen?: boolean;
	modal?: boolean;
	onOpenChange?: (open: boolean, reason?: OpenChangeReason) => void;
	children?: Snippet;
} & Record<string, unknown>;

export type DropdownTriggerProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet;
	disabled?: boolean;
	id?: string;
} & Record<string, unknown>;

export type DropdownContentProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet<[{ open: boolean }]>;
	side?: DropdownSide;
	sideOffset?: number;
	align?: DropdownAlign;
	alignOffset?: number;
	avoidCollisions?: boolean;
	collisionPadding?: number;
	forceMount?: boolean;
	id?: string;
	style?: string | Record<string, unknown>;
	loop?: boolean;
	onCloseAutoFocus?: (event: Event) => void;
	onEscapeKeyDown?: (event: Event) => void;
	onInteractOutside?: (event: Event) => void;
} & Record<string, unknown>;

export type DropdownItemProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet<[Record<string, unknown>]>;
	disabled?: boolean;
	onSelect?: (event: Event) => void;
	id?: string;
} & Record<string, unknown>;

export type DropdownGroupProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet;
} & Record<string, unknown>;

export type DropdownLabelProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet;
} & Record<string, unknown>;

export type DropdownSeparatorProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
} & Record<string, unknown>;

export type DropdownSubProps = {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: Snippet;
} & Record<string, unknown>;

export type DropdownSubTriggerProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet;
	disabled?: boolean;
} & Record<string, unknown>;

export type DropdownSubContentProps = DropdownContentProps;

export type DropdownRadioGroupProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet;
	value?: string;
	onValueChange?: (value: string) => void;
} & Record<string, unknown>;

export type DropdownCheckboxGroupProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: ChildSnippet;
	children?: Snippet;
	value?: string[];
	onValueChange?: (value: string[]) => void;
} & Record<string, unknown>;
