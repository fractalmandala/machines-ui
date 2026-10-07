const STORAGE_PREFIX = 'scroll-position:';
const RESTORE_FRAMES = 12;

let committed: string | null = null;
let traversalTarget: string | null = null;

if (typeof window !== 'undefined') {
	window.history.scrollRestoration = 'manual';
}

function navigationType(): PerformanceNavigationTiming['type'] | undefined {
	const entry = performance.getEntriesByType('navigation')[0];
	return entry instanceof PerformanceNavigationTiming ? entry.type : undefined;
}

function readPosition(path: string): number | null {
	try {
		const stored = sessionStorage.getItem(STORAGE_PREFIX + path);
		const value = stored === null ? NaN : Number(stored);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

function savePosition(path: string): void {
	try {
		sessionStorage.setItem(STORAGE_PREFIX + path, String(Math.round(window.scrollY)));
	} catch {
		// Storage can be unavailable in private or restricted browser contexts.
	}
}

function scrollInstantly(scroll: () => void): void {
	const root = document.documentElement;
	const previous = root.style.scrollBehavior;
	root.style.scrollBehavior = 'auto';
	root.getClientRects();
	scroll();
	root.style.scrollBehavior = previous;
}

function restore(path: string, top: number): void {
	let attempts = 0;
	const frame = () => {
		if (committed !== path) return;
		scrollInstantly(() => window.scrollTo(0, top));
		const reachable = document.documentElement.scrollHeight - window.innerHeight >= top;
		if (!reachable && attempts < RESTORE_FRAMES) {
			attempts += 1;
			window.requestAnimationFrame(frame);
		}
	};
	frame();
}

function update(path: string): void {
	const initial = committed === null;
	const changed = committed !== path;
	committed = path;
	if (!changed) return;

	const type = initial ? navigationType() : undefined;
	const traversal = traversalTarget === path || type === 'back_forward';
	if (traversal) {
		traversalTarget = null;
		restore(path, readPosition(path) ?? 0);
	} else if (window.location.hash) {
		const target = initial ? document.getElementById(window.location.hash.slice(1)) : null;
		if (target) scrollInstantly(() => target.scrollIntoView());
	} else {
		scrollInstantly(() => window.scrollTo(0, 0));
	}
}

export function installScrollToTop(): () => void {
	if (typeof window === 'undefined') return () => {};

	const onPopState = () => {
		const target = window.location.pathname;
		traversalTarget = target === committed ? null : target;
	};
	const save = () => savePosition(window.location.pathname);
	const onVisibilityChange = () => {
		if (document.visibilityState === 'hidden') save();
	};
	const onLocationChange = () => update(window.location.pathname);

	window.addEventListener('popstate', onPopState);
	window.addEventListener('pagehide', save);
	document.addEventListener('visibilitychange', onVisibilityChange);
	window.addEventListener('machines-ui:navigation', onLocationChange);
	update(window.location.pathname);

	return () => {
		window.removeEventListener('popstate', onPopState);
		window.removeEventListener('pagehide', save);
		document.removeEventListener('visibilitychange', onVisibilityChange);
		window.removeEventListener('machines-ui:navigation', onLocationChange);
		save();
	};
}

export function notifyNavigation(path = window.location.pathname): void {
	if (typeof window === 'undefined') return;
	if (path !== window.location.pathname) window.history.pushState({}, '', path);
	window.dispatchEvent(new Event('machines-ui:navigation'));
}

export default installScrollToTop;
