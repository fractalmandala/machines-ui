/**
 * Self-sufficient Svelte 5 state for the Switch family (replaces bits-ui).
 * Adapted from the fs-basics reference Switch (zero-dep) and expanded to keep
 * the bits-ui surface the app relies on: bindable checked, onCheckedChange,
 * data-state/data-disabled attributes and Space/Enter keyboard toggle.
 */
import { getContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';
import type { HTMLButtonAttributes } from 'svelte/elements';

export const SWITCH_ROOT_KEY = Symbol('switch-root');

export type SwitchRootState = {
	readonly checked: boolean;
	readonly disabled: boolean;
	toggle: () => void;
};

export function setSwitchRoot(state: SwitchRootState): SwitchRootState {
	return setContext(SWITCH_ROOT_KEY, state);
}

export function getSwitchRoot(): SwitchRootState {
	const state = getContext<SwitchRootState | undefined>(SWITCH_ROOT_KEY);
	if (!state) {
		throw new Error('Switch thumb/parts must be used within a Switch.Root');
	}
	return state;
}

export type SwitchRootSnippetProps = { checked: boolean };

type SwitchChild = Snippet<
	[
		{
			props: Record<string, unknown>;
			checked: boolean;
		}
	]
>;

export type SwitchRootProps = Omit<
	HTMLButtonAttributes,
	| 'children'
	| 'class'
	| 'checked'
	| 'disabled'
	| 'required'
	| 'value'
	| 'type'
	| 'role'
	| 'onclick'
	| 'onkeydown'
> & {
	ref?: HTMLButtonElement | null;
	class?: string | null | undefined;
	child?: SwitchChild;
	children?: Snippet<[SwitchRootSnippetProps]>;
	checked?: boolean;
	disabled?: boolean;
	required?: boolean;
	name?: string;
	value?: string;
	type?: HTMLButtonAttributes['type'];
	onclick?: (event: MouseEvent) => void;
	onkeydown?: (event: KeyboardEvent) => void;
	onCheckedChange?: (checked: boolean) => void;
};

export type SwitchThumbProps = {
	ref?: HTMLSpanElement | null;
	class?: string | null | undefined;
	child?: SwitchChild;
	children?: Snippet<[SwitchRootSnippetProps]>;
	id?: string;
} & Record<string, unknown>;
