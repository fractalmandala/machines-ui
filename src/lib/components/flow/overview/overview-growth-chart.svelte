<script module lang="ts">
	import './overview-growth-chart.css';
	import IconBadge from '$lib/components/ui/icon-badge.svelte';
	import Divider from '$lib/components/ui/divider.svelte';
	import ChartIcon from '$lib/icons/overview/chart.svelte';
	import { seeded, type ChartData } from './overview-data.js';

	type OverviewGrowthChartProps = {
		data: ChartData;
		animationKey: string;
	};

	const AXIS_WIDTH = 28;

	const TICK_TOP = 11;

	const TICK_BOTTOM_OFFSET = 9;

	const BAR_GAP = 44;
</script>

<script lang="ts">
	import { useMeasure } from '$lib/components/ui/use-measure.svelte.js';

	let { data, animationKey }: OverviewGrowthChartProps = $props();

	const box = useMeasure();

	let hover = $state<number | null>(null);

	const id = `growth-${Math.random().toString(36).slice(2)}`;

	let plotWidth = $derived(Math.max(0, box.width - AXIS_WIDTH));

	let plotHeight = $derived(Math.max(0, box.height - 18));

	const top = TICK_TOP;

	let bottom = $derived(plotHeight - TICK_BOTTOM_OFFSET);

	let total = $derived(data.steps.reduce((sum, step) => sum + step.width, 0));

	let scaleX = $derived(plotWidth / total);

	const y = (value: number) => bottom - (value / data.max) * (bottom - top);

	let segments = $derived(
		data.steps.reduce<{ x0: number; x1: number; value: number }[]>((list, step) => {
			const x0 = list.at(-1)?.x1 ?? 0;
			return [...list, { x0, x1: x0 + step.width * scaleX, value: step.value }];
		}, [])
	);

	let line = $derived(
		segments
			.map((segment, index) => {
				const move = index === 0 ? `M${segment.x0} ${y(segment.value)}` : `V${y(segment.value)}`;
				return `${move} H${segment.x1}`;
			})
			.join(' ')
	);

	let area = $derived(`${line} V${bottom} H0 Z`);

	let sparkles = $derived(
		segments
			.flatMap((segment, index) =>
				Array.from({ length: Math.round((segment.x1 - segment.x0) / 14) }, (_, dot) => {
					const seed = `${animationKey}-${index}-${dot}`;
					return {
						key: seed,
						cx: segment.x0 + 6 + seeded(`${seed}-x`) * Math.max(0, segment.x1 - segment.x0 - 12),
						cy:
							y(segment.value) +
							14 +
							seeded(`${seed}-y`) * Math.max(0, bottom - y(segment.value) - 20),
						r: 0.4 + seeded(`${seed}-r`) * 0.6,
						opacity: 0.3 + seeded(`${seed}-o`) * 0.6
					};
				})
			)
			.filter((dot) => dot.cy < bottom - 4)
	);

	let ticks = $derived([4, 3, 2, 1, 0].map((index) => (data.max / 4) * index));

	let barWidth = $derived(Math.max(0, (plotWidth - BAR_GAP * 5) / 6));

	let hovered = $derived(hover === null ? null : segments[hover]);

	const handleMove = (
		event: PointerEvent & {
			currentTarget: EventTarget & SVGRectElement;
		}
	) => {
		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const index = segments.findIndex((segment) => x >= segment.x0 && x <= segment.x1);
		hover = index === -1 ? null : index;
	};
</script>

<section
	aria-label={data.title}
	class="fs-relative fs-box fl-overview-growth-chart"
>
	<div class="fs-row fs-shrink-0 fs-ycenter fl-overview-growth-chart-div">
		<IconBadge><ChartIcon class="fs-text-white fl-overview-growth-chart-chart-icon" /></IconBadge>
		<span
			class="fs-text-white fl-overview-growth-chart-span"
		>
			{data.title}
		</span>
	</div>
	<Divider />
	<div class="fs-minh0 fs-grow fs-box fs-pt-xl fs-pb-lg fl-overview-growth-chart-div-2">
		<div bind:this={box.node} class="fs-relative fs-grow fl-overview-growth-chart-div-3">
			{#if box.width > 0}
				<svg
					width={box.width}
					height={box.height}
					class="fs-absolute fl-overview-growth-chart-img"
					role="img"
					aria-label={`${data.title}: ${data.steps.map((step, index) => `${data.labels[Math.min(index, data.labels.length - 1)]} ${data.format(step.value)}`).join(', ')}`}
				>
					<defs>
						<linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1">
							<stop stop-color="white" stop-opacity="0"></stop>
							<stop offset="1" stop-color="white" stop-opacity="0.03"></stop>
						</linearGradient>
						<linearGradient
							id={`${id}-line`}
							gradientUnits="userSpaceOnUse"
							x1="0"
							y1={bottom}
							x2={plotWidth}
							y2={top}
						>
							<stop stop-color="#4961fc"></stop>
							<stop offset="0.41" stop-color="#7649fc"></stop>
							<stop offset="0.62" stop-color="#bd49fc"></stop>
							<stop offset="1" stop-color="#12a8ff"></stop>
						</linearGradient>
						<linearGradient
							id={`${id}-fill`}
							gradientUnits="userSpaceOnUse"
							x1="0"
							y1={top + 40}
							x2="0"
							y2={bottom}
						>
							<stop stop-color="#7649fc" stop-opacity="0.16"></stop>
							<stop offset="1" stop-color="#7649fc" stop-opacity="0"></stop>
						</linearGradient>
						<filter id={`${id}-glow`} x="-10%" y="-20%" width="120%" height="160%">
							<feDropShadow dx="0" dy="7" stdDeviation="6.5" flood-color="#5016ff" flood-opacity="0.5"
							></feDropShadow>
						</filter>
					</defs>
					<g opacity="0.5">
						{#each Array.from({ length: 6 }) as _, index (index)}
							<rect
								x={index * (barWidth + BAR_GAP)}
								y={0}
								width={barWidth}
								height={bottom + TICK_BOTTOM_OFFSET}
								fill={`url(#${id}-bar)`}
							></rect>
						{/each}
					</g>
					<line
						x1={0}
						x2={plotWidth}
						y1={bottom}
						y2={bottom}
						stroke="white"
						stroke-opacity="0.1"
						stroke-dasharray="3 6"
						stroke-linecap="round"
					></line>
					{#each ticks as tick (tick)}
						<text
							x={box.width}
							y={y(tick)}
							dy="0.32em"
							text-anchor="end"
							class="fl-overview-growth-chart-text"
						>
							{data.max === 8 ? tick : data.format(tick)}
						</text>
					{/each}
					<g>
						<path d={area} fill={`url(#${id}-fill)`} class="fl-overview-growth-chart-path"></path>
						{#each sparkles as dot (dot.key)}
							<circle
								cx={dot.cx}
								cy={dot.cy}
								r={dot.r}
								fill="#6fb6ff"
								opacity={dot.opacity}
								class="fl-overview-growth-chart-circle"
							></circle>
						{/each}
						<path
							d={line}
							fill="none"
							stroke={`url(#${id}-line)`}
							stroke-width={3}
							pathLength={1}
							stroke-dasharray="1"
							filter={`url(#${id}-glow)`}
							class="fl-overview-growth-chart-path-2"
						></path>
					</g>
					{#if hovered}
						<g pointer-events="none">
							<line
								x1={(hovered.x0 + hovered.x1) / 2}
								x2={(hovered.x0 + hovered.x1) / 2}
								y1={y(hovered.value)}
								y2={bottom}
								stroke="white"
								stroke-opacity="0.16"
								stroke-dasharray="2 4"
							></line>
							<circle
								cx={(hovered.x0 + hovered.x1) / 2}
								cy={y(hovered.value)}
								r={4}
								fill="#141417"
								stroke="white"
								stroke-width={2}
							></circle>
						</g>
					{/if}
					<rect
						role="presentation"
						x={0}
						y={0}
						width={plotWidth}
						height={bottom + TICK_BOTTOM_OFFSET}
						fill="transparent"
						onpointermove={handleMove}
						onpointerleave={() => (hover = null)}
					></rect>
				</svg>
			{/if}
			{#if hovered}
				<span
					style="--tip-x: {`${(hovered.x0 + hovered.x1) / 2}px`}; --tip-y: {`${y(hovered.value)}px`}"
					class="fs-absolute fs-box fs-ta-c fl-overview-growth-chart-span-2"
				>
					<span class="fs-text-white fl-overview-growth-chart-span-3"
						>{data.format(hovered.value)}</span
					>
					<span class="fl-overview-growth-chart-span-4">
						{data.labels[
							Math.min(
								Math.floor((hover! / data.steps.length) * data.labels.length),
								data.labels.length - 1
							)
						]}
					</span>
				</span>
			{/if}
		</div>
		<div
			class="fs-row fs-shrink-0 fs-ycenter fs-xbetween fs-pl-sm fs-weight-400 fl-overview-growth-chart-div-4"
		>
			{#each data.labels as label, index (`${label}-${index}`)}
				<span>{label}</span>
			{/each}
		</div>
	</div>
	<div
		class="fs-absolute fl-overview-growth-chart-div-5"
	></div>
</section>
