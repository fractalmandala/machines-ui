export function useNow(interval = 30_000) {
	let now = $state(Date.now());

	$effect(() => {
		const timer = window.setInterval(() => {
			now = Date.now();
		}, interval);
		return () => window.clearInterval(timer);
	});

	return {
		get value() {
			return now;
		}
	};
}
