/**
 * Self-sufficient Svelte 5 state for the Tooltip family (replaces bits-ui).
 * Logic adapted from the fs-basics reference Tooltip (zero-dep) and expanded
 * to keep the bits-ui surface the app's CSS relies on:
 * - data-state="closed"|"delayed-open"|"instant-open" (hover delay + skip window)
 * - portal to <body>, manual floating positioning (shared floating.svelte.ts),
 *   presence-driven unmount after the exit animation
 */
import { getContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';
import { computeFloatingPosition, type Rect, type Side, type Align } from '../floating.svelte.js';

export const TOOLTIP_PROVIDER_KEY = Symbol('tooltip-provider');
export const TOOLTIP_ROOT_KEY = Symbol('tooltip-root');

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
export type TooltipAlign = Align;

export type TooltipTriggerRecord = {
	id: string;
	node: HTMLElement | null;
};

export type TooltipProviderState = {
	delayDuration: number;
	skipDelayDuration: number;
	disableHoverableContent: boolean;
	disableCloseOnTriggerClick: boolean;
	closeOnEscape: boolean;
	closeOnPointerDown: boolean;
	isSkipDelayActive: () => boolean;
	notifyOpened: (root: TooltipRootState) => void;
	notifyClosed: (root: TooltipRootState) => void;
};

export function setTooltipProvider(state: TooltipProviderState): TooltipProviderState {
	return setContext(TOOLTIP_PROVIDER_KEY, state);
}

export function getTooltipProvider(): TooltipProviderState | undefined {
	return getContext<TooltipProviderState | undefined>(TOOLTIP_PROVIDER_KEY);
}

export type TooltipArrowPosition = {
	x: number;
	y: number;
	side: TooltipSide;
};

/**
 * Exported for the arrow components that read the placed side.
 */
export type { Rect, Side };

export type TooltipRootState = {
	readonly open: boolean;
	readonly disabled: boolean;
	readonly delayDuration: number;
	readonly disableHoverableContent: boolean;
	readonly disableCloseOnTriggerClick: boolean;
	readonly stateAttr: 'closed' | 'delayed-open' | 'instant-open';
	readonly activeTrigger: TooltipTriggerRecord | null;
	readonly contentId: string | undefined;
	readonly contentNode: HTMLElement | null;
	readonly arrow: TooltipArrowPosition | null;
	registerTrigger: (record: TooltipTriggerRecord) => void;
	unregisterTrigger: (id: string) => void;
	isTriggerNode: (node: Node) => boolean;
	setActiveTrigger: (record: TooltipTriggerRecord | null) => void;
	setContent: (id: string | undefined, node: HTMLElement | null) => void;
	setArrow: (arrow: TooltipArrowPosition | null) => void;
	onTriggerEnter: (id: string, node: HTMLElement | null) => void;
	onTriggerLeave: () => void;
	onContentEnter: () => void;
	onContentLeave: () => void;
	cancelPendingOpen: () => void;
	handleOpen: () => void;
	handleClose: () => void;
};

export function setTooltipRoot(state: TooltipRootState): TooltipRootState {
	return setContext(TOOLTIP_ROOT_KEY, state);
}

export function getTooltipRoot(): TooltipRootState {
	const state = getContext<TooltipRootState | undefined>(TOOLTIP_ROOT_KEY);
	if (!state) {
		throw new Error('Tooltip trigger/content must be used within a Tooltip.Root');
	}
	return state;
}

/**
 * Wait until every CSS animation/transition running on `node` has finished.
 * Used to keep tooltip content mounted while its exit animation plays before
 * unmounting (bits-ui presence behavior). Hard timeout as a safety net.
 */
export async function waitForTooltipAnimations(node: HTMLElement, timeoutMs = 500): Promise<void> {
	await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
	const animations = node.getAnimations({ subtree: false });
	if (!animations.length) return;
	await Promise.race([
		Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))),
		new Promise((resolve) => setTimeout(resolve, timeoutMs))
	]);
}
/**
 * Viewport-relative floating math (FloatingUI-lite) for tooltip content.
 * Returns document-space coordinates plus the placed side (after optional
 * flip + clamp), consumed as `position: absolute; left/top` on <body>.
 */
export function computeTooltipPosition(opts: {
	triggerRect: Rect;
	contentWidth: number;
	contentHeight: number;
	side: TooltipSide;
	sideOffset: number;
	align: TooltipAlign;
	alignOffset: number;
	avoidCollisions: boolean;
	collisionPadding: number;
	scrollX: number;
	scrollY: number;
	viewportWidth: number;
	viewportHeight: number;
}): { x: number; y: number; side: TooltipSide } {
	const {
		triggerRect: r,
		contentWidth: cw,
		contentHeight: ch,
		side: desiredSide,
		sideOffset,
		align,
		alignOffset,
		avoidCollisions,
		collisionPadding: pad,
		scrollX,
		scrollY,
		viewportWidth: vw,
		viewportHeight: vh
	} = opts;

	return computeFloatingPosition({
		triggerRect: r,
		contentWidth: cw,
		contentHeight: ch,
		side: desiredSide,
		sideOffset,
		align,
		alignOffset,
		avoidCollisions,
		collisionPadding: pad,
		scrollX,
		scrollY,
		viewportWidth: vw,
		viewportHeight: vh
	});
}

export type TooltipProviderProps = {
	delayDuration?: number;
	skipDelayDuration?: number;
	disableSkipAnimationDelay?: boolean;
	disableHoverableContent?: boolean;
	disableCloseOnTriggerClick?: boolean;
	closeOnEscape?: boolean;
	closeOnPointerDown?: boolean;
	children?: Snippet;
} & Record<string, unknown>;

export type TooltipRootProps = {
	open?: boolean;
	defaultOpen?: boolean;
	disabled?: boolean;
	delayDuration?: number;
	disableHoverableContent?: boolean;
	disableCloseOnTriggerClick?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: Snippet;
} & Record<string, unknown>;

export type TooltipTriggerProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: Snippet<[{ props: Record<string, unknown> }]>;
	children?: Snippet;
	disabled?: boolean;
	id?: string;
	tabindex?: number | string;
} & Record<string, unknown>;

export type TooltipContentProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: Snippet<[{ props: Record<string, unknown> }]>;
	children?: Snippet<[{ open: boolean }]>;
	side?: TooltipSide;
	sideOffset?: number;
	align?: TooltipAlign;
	alignOffset?: number;
	avoidCollisions?: boolean;
	collisionPadding?: number;
	forceMount?: boolean;
	id?: string;
	style?: string | Record<string, unknown>;
} & Record<string, unknown>;

export type TooltipArrowProps = {
	ref?: HTMLElement | null;
	class?: string | null | undefined;
	child?: Snippet<[{ props: Record<string, unknown> }]>;
	children?: Snippet;
	width?: number;
	height?: number;
} & Record<string, unknown>;

export type TooltipPortalProps = {
	to?: string | HTMLElement;
	children?: Snippet;
} & Record<string, unknown>;
