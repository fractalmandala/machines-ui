import { clsx, type ClassValue } from 'clsx';

/** Join class values. Callers' classes are real rules now, so there is nothing to merge: the cascade decides. */
export function cn(...inputs: ClassValue[]) {
	return clsx(inputs);
}

const REACT_STYLE_EVENT = /^on[A-Z]/;

/**
 * Rest props ported from React carry camelCase event names (onClick, onChange...).
 * Svelte 5 only treats lowercase names (onclick...) as event listeners, so
 * camelCase keys would land as inert attributes. Lowercase them before spreading
 * onto a native element.
 */
export function normalizeDomProps(props: Record<string | symbol, unknown>): Record<string | symbol, unknown> {
	const out: Record<string | symbol, unknown> = {};
	for (const [key, value] of Object.entries(props)) {
		out[REACT_STYLE_EVENT.test(key) ? key.toLowerCase() : key] = value;
	}
	// symbol keys carry attachments (`createAttachmentKey`); entries() skips them
	for (const key of Object.getOwnPropertySymbols(props)) {
		out[key] = props[key];
	}
	return out;
}

/** React-echo setState shape: a value, or an updater of the previous value. */
export type StateInput<T> = T | ((prev: T) => T);

/** Resolve a React-style setState argument against the current value. */
export function resolveState<T>(current: T, value: StateInput<T>): T {
	return typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
}

export function slugify(str: string): string {
	return str
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^\w-]+/g, '')
		.replace(/--+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function shuffle<T>(items: readonly T[]): T[] {
	const result = [...items];

	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result;
}
