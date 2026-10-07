const COMPACT_QUERY = '(max-width: 639px)';

export type CompactState = {
	readonly matches: boolean;
};

export function useCompact(): CompactState {
	let matches = $state(false);

	$effect(() => {
		if (typeof window === 'undefined') return;

		const query = window.matchMedia(COMPACT_QUERY);
		const update = () => {
			matches = query.matches;
		};

		update();
		query.addEventListener('change', update);
		return () => query.removeEventListener('change', update);
	});

	return {
		get matches() {
			return matches;
		}
	};
}
