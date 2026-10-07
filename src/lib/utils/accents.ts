// Accent system for the docs site. A choice paints --graph-accent/-2/-3 onto <html>; every graph
// picks it up through the CSS variable contract. The colours themselves are the package's one
// accent palette (ACCENTS in core/values.ts): this file lists them for the picker and applies
// whichever is chosen, and holds no colour of its own.

import { ACCENTS } from '../core/values.js';

export const ACCENT_STORAGE_KEY = 'machines-ui-user-accent';
export const ACCENT_EVENT = 'machines-ui-accent';
export const DEFAULT_ACCENT_ID = ACCENTS[0].value.toLowerCase();

// The picker's swatches: the palette, each colour its own id.
export const accents = ACCENTS.map((accent) => {
	const hex = accent.value.toLowerCase();

	return { id: hex, label: accent.name, accent: hex };
});

let shimmerTimer: number | undefined;

export function currentAccentId(): string {
	if (typeof document === 'undefined') {
		return DEFAULT_ACCENT_ID;
	}

	return document.documentElement.getAttribute('data-accent') ?? DEFAULT_ACCENT_ID;
}

/** Paint an accent (any colour: a palette one or a custom one) onto <html>, persist it, and announce it. */
export function setAccent(hex: string) {
	const normalized = hex.toLowerCase();
	const root = document.documentElement;

	if (root.getAttribute('data-accent') === normalized) return;

	const apply = () => {
		root.setAttribute('data-accent', normalized);
		root.style.setProperty('--graph-accent', normalized);
		root.style.setProperty('--graph-accent-2', `color-mix(in oklch, ${normalized} 65%, black)`);
		root.style.setProperty('--graph-accent-3', `color-mix(in oklch, ${normalized} 50%, white)`);

		try {
			localStorage.setItem(ACCENT_STORAGE_KEY, normalized);
		} catch {
			/* private mode: the accent just won't persist */
		}

		window.dispatchEvent(new Event(ACCENT_EVENT));
	};

	const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const doc = document as Document & {
		startViewTransition?: (update: () => void) => { finished: Promise<void> };
	};

	if (!reduce && typeof doc.startViewTransition === 'function') {
		root.classList.add('accent-wiping');
		const transition = doc.startViewTransition(apply);

		// an aborted transition (tab hidden mid-wipe) rejects: clean up either way
		transition.finished.finally(() => root.classList.remove('accent-wiping')).catch(() => {});

		return;
	}

	apply();

	if (!reduce) {
		clearTimeout(shimmerTimer);
		root.classList.remove('accent-shimmer');
		void root.offsetWidth;
		root.classList.add('accent-shimmer');
		shimmerTimer = window.setTimeout(() => root.classList.remove('accent-shimmer'), 420);
	}
}
