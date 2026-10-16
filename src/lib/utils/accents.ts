// Accent system for the docs site. A choice paints --graph-accent/-2/-3 and the site's own
// --theme-color/-alt onto <html>; every graph and every fs- class picks it up through the CSS variable contract. The colours themselves are the package's one
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

// What one accent colour paints onto <html>. `{hex}` is the colour. Both the running code and the pre-paint script
// (`accentScript`) read this table, so they cannot disagree.
const ACCENT_VARS: [string, string][] = [
	['--graph-accent', '{hex}'],
	['--graph-accent-2', 'color-mix(in oklch, {hex} 65%, black)'],
	['--graph-accent-3', 'color-mix(in oklch, {hex} 50%, white)'],
	// the site's colour (links, primary buttons, borders) follows the accent too
	['--theme-color', '{hex}'],
	['--theme-color-alt', 'color-mix(in oklch, {hex} 80%, black)']
];

function paintVars(root: HTMLElement, hex: string) {
	root.setAttribute('data-accent', hex);

	for (const [name, template] of ACCENT_VARS) root.style.setProperty(name, template.replaceAll('{hex}', hex));
}

/**
 * Inline this in <svelte:head> next to `modeScript()`, so the saved accent (or the default) is on <html> before the
 * first paint. Without it the tokens' fixed --theme-color shows until the app mounts, and every reload flashes it.
 *
 * ```svelte
 * <svelte:head>
 *   {@html `<script>${accentScript()}<\/script>`}
 * </svelte:head>
 * ```
 */
export function accentScript(): string {
	return `(function(){try{var h=localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)});if(!/^#[0-9a-f]{6}$/i.test(h||''))h=${JSON.stringify(DEFAULT_ACCENT_ID)};h=h.toLowerCase();var r=document.documentElement;r.setAttribute('data-accent',h);${JSON.stringify(ACCENT_VARS)}.forEach(function(v){r.style.setProperty(v[0],v[1].split('{hex}').join(h))})}catch(e){}})()`;
}

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
		paintVars(root, normalized);

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

/**
 * On load: paint the saved accent, or the default one, so the site colour matches the picker from the first
 * paint of the app. Without this the tokens' fixed --theme-color shows until someone chooses an accent.
 */
export function restoreAccent() {
	let saved: string | null = null;

	try {
		saved = localStorage.getItem(ACCENT_STORAGE_KEY);
	} catch {
		/* private mode: fall back to the default */
	}

	const hex = saved && /^#[0-9a-f]{6}$/i.test(saved) ? saved : DEFAULT_ACCENT_ID;

	// paint without the wipe: nothing is changing on screen yet
	paintVars(document.documentElement, hex.toLowerCase());
	window.dispatchEvent(new Event(ACCENT_EVENT));
}
