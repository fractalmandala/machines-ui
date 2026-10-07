/**
 * Self-sufficient Svelte 5 state for the Collapsible family (replaces bits-ui).
 * Adapted from the fs-basics reference Collapsible (zero-dep) and expanded to
 * keep the bits-ui surface the app's CSS relies on:
 * - data-state="open"|"closed" on root/trigger/content
 * - the `--bits-collapsible-content-height` CSS variable driving the
 *   collapsible-down/collapsible-up keyframe animations in app.css
 * - presence: content stays mounted (hidden) while the exit animation plays
 */
import { getContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';

export const COLLAPSIBLE_ROOT_KEY = Symbol('collapsible-root');

export type CollapsibleRootState = {
	readonly open: boolean;
	readonly disabled: boolean;
	readonly contentId: string | undefined;
	setContentId: (id: string | undefined) => void;
	setOpen: (open: boolean) => void;
	toggle: () => void;
};

export function setCollapsibleRoot(state: CollapsibleRootState): CollapsibleRootState {
	return setContext(COLLAPSIBLE_ROOT_KEY, state);
}

export function getCollapsibleRoot(): CollapsibleRootState {
	const state = getContext<CollapsibleRootState | undefined>(COLLAPSIBLE_ROOT_KEY);
	if (!state) {
		throw new Error('Collapsible trigger/content must be used within a Collapsible.Root');
	}
	return state;
}

/**
 * Wait until every CSS animation/transition running on `node` has finished.
 * Mirrors the presence behavior bits-ui got from its AnimationsComplete helper:
 * the element stays rendered while the exit animation plays, then is unmounted
 * (hidden). A hard timeout guards against animations that never resolve.
 */
export async function waitForAnimationsComplete(node: HTMLElement, timeoutMs = 500): Promise<void> {
	// let the browser start the animations triggered by the latest state flip
	await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
	const animations = node.getAnimations({ subtree: false });
	if (!animations.length) return;
	await Promise.race([
		Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))),
		new Promise((resolve) => setTimeout(resolve, timeoutMs))
	]);
}

export type CollapsibleSnippetProps = { open: boolean };

type CollapsibleChild = Snippet<
	[
		{
			props: Record<string, unknown>;
			open: boolean;
		}
	]
>;

export type CollapsibleRootProps = {
	ref?: HTMLDivElement | null;
	class?: string | null | undefined;
	child?: CollapsibleChild;
	children?: Snippet<[CollapsibleSnippetProps]>;
	open?: boolean;
	disabled?: boolean;
	id?: string;
	onOpenChange?: (open: boolean) => void;
} & Record<string, unknown>;

export type CollapsibleTriggerProps = {
	ref?: HTMLButtonElement | null;
	class?: string | null | undefined;
	child?: CollapsibleChild;
	children?: Snippet<[]>;
	disabled?: boolean;
	id?: string;
	onclick?: (event: MouseEvent) => void;
	onkeydown?: (event: KeyboardEvent) => void;
} & Record<string, unknown>;

export type CollapsibleContentProps = {
	ref?: HTMLDivElement | null;
	class?: string | null | undefined;
	child?: CollapsibleChild;
	children?: Snippet<[]>;
	forceMount?: boolean;
	id?: string;
} & Record<string, unknown>;
