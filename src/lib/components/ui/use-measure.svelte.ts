// ResizeObserver-backed measurement for Svelte components.
// Call it in a component, `bind:this` the returned `node`, and read `width`/`height`.

export type Box = {
	node: HTMLElement | null;
	width: number;
	height: number;
};

export function useMeasure<T extends HTMLElement = HTMLElement>() {
	const box = $state({ node: null, width: 0, height: 0 }) as Box & {
		node: T | null;
	};

	$effect(() => {
		const element = box.node;
		if (!element || typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver((entries) => {
			const rect = entries[0]?.contentRect;
			if (!rect) return;
			box.width = rect.width;
			box.height = rect.height;
		});

		observer.observe(element);
		box.width = element.clientWidth;
		box.height = element.clientHeight;

		return () => observer.disconnect();
	});

	return box;
}
