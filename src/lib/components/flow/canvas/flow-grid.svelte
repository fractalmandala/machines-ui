<script module lang="ts">
	import './flow-grid.css';
	import { onMount } from 'svelte';
	import { flow, type FlowView } from '$lib/stores/flow-store.svelte';
	import { GRID_SIZE } from './flow-geometry.js';

	const DOT_COLOR = '#1b1b20';

	const DOT_RADIUS = 1.15;

	const MIN_RADIUS = 0.75;

	const LEVELS = 5;

	const FADE_START = 6;

	const FADE_END = 10;

	const tiles = new Map<string, HTMLCanvasElement>();

	function smoothstep(edge0: number, edge1: number, value: number) {
		const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
		return t * t * (3 - 2 * t);
	}

	function dotTile(size: number, radius: number) {
		const key = `${size}:${radius.toFixed(2)}`;
		const cached = tiles.get(key);
		if (cached) return cached;
		if (tiles.size > 48) tiles.clear();
		const tile = document.createElement('canvas');
		tile.width = size;
		tile.height = size;
		const context = tile.getContext('2d')!;
		context.fillStyle = DOT_COLOR;
		context.beginPath();
		context.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
		context.fill();
		tiles.set(key, tile);
		return tile;
	}

	function drawGrid(
		context: CanvasRenderingContext2D,
		view: FlowView,
		width: number,
		height: number,
		ratio: number
	) {
		context.setTransform(1, 0, 0, 1, 0, 0);
		context.clearRect(0, 0, context.canvas.width, context.canvas.height);
		const radius = Math.max(MIN_RADIUS, DOT_RADIUS * Math.sqrt(view.zoom)) * ratio;
		const originX = (width / 2 + view.x) * ratio;
		const originY = view.y * ratio;
		for (let level = 0; level < LEVELS; level++) {
			const spacing = GRID_SIZE * 2 ** level * view.zoom;
			const alpha = smoothstep(FADE_START, FADE_END, spacing);
			if (alpha <= 0.01 && level < LEVELS - 1) continue;
			const step = spacing * ratio;
			const size = Math.max(2, Math.round(step));
			const scale = step / size;
			const pattern = context.createPattern(dotTile(size, radius / scale), 'repeat');
			if (!pattern) return;
			pattern.setTransform(
				new DOMMatrix([scale, 0, 0, scale, originX - step / 2, originY - step / 2])
			);
			context.globalAlpha = Math.max(alpha, level === LEVELS - 1 ? 1 : 0);
			context.fillStyle = pattern;
			context.fillRect(0, 0, context.canvas.width, context.canvas.height);
			if (alpha >= 0.999) break;
		}
		context.globalAlpha = 1;
	}
</script>

<script lang="ts">
	let ref = $state<HTMLCanvasElement | null>(null);
	let context: CanvasRenderingContext2D | null = null;
	let width = 0;
	let height = 0;
	let ratio = 1;

	function render() {
		if (!width || !height || !context) return;
		drawGrid(context, flow.view, width, height, ratio);
	}

	function resize() {
		if (!ref) return;
		const rect = ref.getBoundingClientRect();
		const nextRatio = window.devicePixelRatio || 1;
		if (rect.width === width && rect.height === height && nextRatio === ratio) return;
		width = rect.width;
		height = rect.height;
		ratio = nextRatio;
		ref.width = Math.round(width * ratio);
		ref.height = Math.round(height * ratio);
		render();
		ref.dataset.ready = '';
	}

	onMount(() => {
		context = ref?.getContext('2d') ?? null;
		if (!ref || !context) return;
		const observer = new ResizeObserver(resize);
		observer.observe(ref);
		resize();
		return () => observer.disconnect();
	});

	$effect(() => {
		void flow.view;
		render();
	});
</script>

<canvas
	bind:this={ref}
	aria-hidden="true"
	class="fs-absolute fs-full fs-flow-grid"
></canvas>
