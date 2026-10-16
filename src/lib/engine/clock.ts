import type { Clock } from './run-types.js';

/** Real time: `sleep` waits. */
export const realClock: Clock = {
	fast: false,
	now: () => Date.now(),
	sleep: (ms, signal) =>
		new Promise((resolve, reject) => {
			if (signal?.aborted) return reject(signal.reason);

			const timer = setTimeout(resolve, ms);

			signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
		})
};

/**
 * A clock for simulations: `sleep` does not wait, it moves this clock's own time forward and returns.
 * A run that "waits until Monday 9:00" finishes at once, and its log says how long it would have waited.
 */
export function fastClock(start = Date.now()): Clock {
	let offset = 0;

	return {
		fast: true,
		now: () => start + offset,
		async sleep(ms, signal) {
			if (signal?.aborted) throw signal.reason;
			offset += Math.max(0, ms);
			await Promise.resolve();
		}
	};
}
