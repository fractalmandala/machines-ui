import { ease, type EaseName } from './easings.js';

export type CubicBezier = [number, number, number, number];

export type Easing = (progress: number) => number;

export type TweenOptions = {
	/** Duration in seconds. */
	duration?: number;
	/** Easing curve: a named preset from `ease`, a CSS cubic-bezier tuple, or a function. */
	ease?: EaseName | CubicBezier | Easing;
	onUpdate?: (value: number) => void;
	onComplete?: () => void;
};

export type TweenHandle = {
	/** Stops the tween immediately, leaving the value at its last update. */
	cancel: () => void;
};

const newtonIterations = 8;

const newtonMinSlope = 0.001;

const subdivisionPrecision = 0.000001;

const subdivisionMaxIterations = 10;

/**
 * CSS cubic-bezier(P1, P2) solver: maps x (linear time) to y (eased progress).
 * Newton-Raphson first, bisection fallback — same strategy as browsers/CSS.
 */
function cubicBezier([x1, y1, x2, y2]: CubicBezier): Easing {
	const sampleX = (t: number) =>
		3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
	const sampleY = (t: number) =>
		3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
	const sampleDerivativeX = (t: number) =>
		3 * (1 - t) * (1 - t) * x1 +
		6 * (1 - t) * t * (x2 - x1) +
		3 * t * t * (1 - x2);
	return (x) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let i = 0; i < newtonIterations; i++) {
			const error = sampleX(t) - x;
			if (Math.abs(error) < subdivisionPrecision) return sampleY(t);
			const slope = sampleDerivativeX(t);
			if (Math.abs(slope) < newtonMinSlope) break;
			t -= error / slope;
		}
		let lower = 0;
		let upper = 1;
		t = x;
		for (let i = 0; i < subdivisionMaxIterations; i++) {
			if (Math.abs(sampleX(t) - x) < subdivisionPrecision) break;
			if (sampleX(t) < x) lower = t;
			else upper = t;
			t = (lower + upper) / 2;
		}
		return sampleY(t);
	};
}

function resolveEasing(easing: EaseName | CubicBezier | Easing): Easing {
	if (typeof easing === 'function') return easing;
	const bezier = Array.isArray(easing) ? easing : ease[easing];
	return cubicBezier(bezier);
}

/**
 * rAF-driven tween between two numbers. Time-based: a delayed frame does not
 * stretch the tween. The final update lands exactly on `to`, then `onComplete`
 * fires once; `cancel()` halts without further updates or completion.
 */
export function tween(from: number, to: number, options: TweenOptions = {}): TweenHandle {
	const { duration = 0.3, ease: easing = 'power2Out', onUpdate, onComplete } = options;
	const easingFn = resolveEasing(easing);
	const total = Math.max(0, duration * 1000);
	let frame = 0;
	let startTime: number | null = null;
	let cancelled = false;
	const step = (now: number) => {
		if (cancelled) return;
		if (startTime === null) startTime = now;
		const elapsed = now - startTime;
		const progress = total === 0 ? 1 : Math.min(1, elapsed / total);
		onUpdate?.(from + (to - from) * easingFn(progress));
		if (progress < 1) {
			frame = requestAnimationFrame(step);
		} else {
			onComplete?.();
		}
	};
	frame = requestAnimationFrame(step);
	return {
		cancel() {
			cancelled = true;
			cancelAnimationFrame(frame);
		}
	};
}
