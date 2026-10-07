import type { Snippet } from 'svelte';

export type DialogRootProps = {
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	children?: Snippet;
	[key: string]: unknown;
};

export type DialogTriggerChildProps = Record<string, any> & {
	id: string;
	type: 'button';
	'aria-haspopup': 'dialog';
	'aria-expanded': boolean;
	'aria-controls': string;
	'data-state': 'open' | 'closed';
	onclick: (event: Event) => void;
};

export type DialogTriggerProps = {
	child?: Snippet<[{ props: DialogTriggerChildProps }]>;
	children?: Snippet;
	ref?: HTMLElement | null;
	class?: string;
	id?: string;
	[key: string]: unknown;
};

export type DialogCloseChildProps = Record<string, any> & {
	type: 'button';
	'data-state': 'open' | 'closed';
	onclick: (event: Event) => void;
};

export type DialogCloseProps = {
	child?: Snippet<[{ props: DialogCloseChildProps }]>;
	children?: Snippet;
	ref?: HTMLElement | null;
	class?: string;
	id?: string;
	[key: string]: unknown;
};

export type DialogContentProps = {
	ref?: HTMLElement | null;
	children?: Snippet;
	id?: string;
	class?: string;
	style?: string;
	'aria-describedby'?: string | undefined;
	[key: string]: unknown;
};

export type DialogOverlayProps = {
	ref?: HTMLElement | null;
	children?: Snippet;
	class?: string;
	style?: string;
	[key: string]: unknown;
};

export type DialogTitleProps = {
	ref?: HTMLElement | null;
	children?: Snippet;
	class?: string;
	id?: string;
	[key: string]: unknown;
};

export type DialogDescriptionProps = {
	ref?: HTMLElement | null;
	children?: Snippet;
	class?: string;
	id?: string;
	[key: string]: unknown;
};

export type DialogPortalProps = {
	children?: Snippet;
	to?: HTMLElement | null;
	[key: string]: unknown;
};
