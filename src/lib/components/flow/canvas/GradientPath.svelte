<script lang="ts">
	import { type Point } from './flow-geometry.js';

	let {
		id,
		from,
		to,
		fromColor,
		toColor,
		path,
		dash,
		className
	}: {
		id: string;
		from: Point;
		to: Point;
		fromColor: string;
		toColor: string;
		path: string;
		/** SVG `stroke-dasharray`; leave unset for a solid line. */
		dash?: string;
		className?: string;
	} = $props();

	let degenerate = $derived(Math.abs(from.x - to.x) < 0.5 && Math.abs(from.y - to.y) < 0.5);
</script>

<defs>
	<linearGradient
		{id}
		gradientUnits="userSpaceOnUse"
		x1={from.x}
		y1={from.y}
		x2={degenerate ? from.x : to.x}
		y2={degenerate ? from.y + 1 : to.y}
	>
		<stop stop-color={fromColor}></stop>
		<stop offset="1" stop-color={toColor}></stop>
	</linearGradient>
</defs>
<path
	d={path}
	fill="none"
	stroke={`url(#${id})`}
	stroke-width={2}
	stroke-linecap="round"
	stroke-dasharray={dash}
	class={className}
></path>
