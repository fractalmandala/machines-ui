<script module lang="ts">
	import './flow-edges.css';
	import { clsx } from 'clsx';
	import Button from '$lib/components/ui/button.svelte';
	import type {
		PortId,
		FlowEdge,
		FlowNodeData,
		FlowSelection
	} from '$lib/stores/flow-store.svelte';
	import ChevronDownIcon from '$lib/icons/flow/chevron-down.svelte';
	import { ACTIONS } from './flow-actions.js';
	import {
		actionPoint,
		inputPoint,
		labelPoint,
		openPorts,
		outputPoint,
		outputSide,
		roundedPath,
		routeBetween,
		routeToPoint,
		type OpenPort,
		type Point
	} from './flow-geometry.js';
	import BranchLabel from './BranchLabel.svelte';
	import GradientPath from './GradientPath.svelte';
	import { DASH_ARRAYS } from '$lib/core/values.js';
	import SelectField from '$lib/components/ui/select-field.svelte';
	import { routeEdge } from '$lib/core/route.js';
	import { ACCENTS, DASHES, type Dash, type PortSide } from '$lib/core/values.js';
	import { checkpoint, updateEdge } from '$lib/stores/flow-store.svelte';

	export type EdgePreview = {
		from: Point;
		/** The side the link leaves its node from. */
		fromSide: PortSide;
		to: Point;
		/** The side the link enters at: the hovered node's input side, or the one facing back at the source. */
		toSide: PortSide;
		fromColor: string;
		toColor: string;
	};

	type FlowEdgesProps = {
		nodes: FlowNodeData[];
		edges: FlowEdge[];
		sizes: Record<string, number>;
		selection: FlowSelection;
		snapKey: string | null;
		preview: EdgePreview | null;
		activeEdgeId: string | null;
		traversed: string[];
		onEdgePointerDown: (id: string, event: PointerEvent) => void;
		onEndpointPointerDown: (source: string, port: PortId, event: PointerEvent) => void;
		onDeleteEdge: () => void;
	};

	export function portKey(source: string, port: PortId) {
		return `${source}:${port}`;
	}

	const labelText: Partial<Record<PortId, string>> = {
		true: 'TRUE',
		false: 'FALSE'
	};

	function positionStyle(point: Point) {
		return `--point-x:${point.x}px;--point-y:${point.y}px;`;
	}
</script>

<script lang="ts">
	let {
		nodes,
		edges,
		sizes,
		selection,
		snapKey,
		preview,
		activeEdgeId,
		traversed,
		onEdgePointerDown,
		onEndpointPointerDown,
		onDeleteEdge
	}: FlowEdgesProps = $props();

	let byId = $derived(new Map(nodes.map((node) => [node.id, node])));

	let routed = $derived(
		edges.flatMap((edge) => {
			const source = byId.get(edge.source);
			const target = byId.get(edge.target);
			if (!source || !target) return [];
			const from = outputPoint(source, sizes, edge.port);
			const to = inputPoint(target, sizes);
			const points = routeBetween(source, edge.port, target, sizes);
			return [{ edge, source, target, from, to, points, path: roundedPath(points) }];
		})
	);

	let labels: {
		id: string;
		point: Point;
		port: PortId;
	}[] = $derived.by(() => {
		const labels: {
			id: string;
			point: Point;
			port: PortId;
		}[] = [];
		for (const { edge, points } of routed) {
			if (!labelText[edge.port]) continue;
			const preferred = labelPoint(points);
			const taken = labels.some(
				(label) =>
					Math.abs(label.point.x - preferred.x) < 64 && Math.abs(label.point.y - preferred.y) < 24
			);
			labels.push({
				id: edge.id,
				port: edge.port,
				point: taken ? actionPoint(points) : preferred
			});
		}
		return labels;
	});

	let open: OpenPort[] = $derived(openPorts(nodes, edges, sizes));

	let selectedEdge = $derived(
		selection?.type === 'edge' ? routed.find((item) => item.edge.id === selection.id) : undefined
	);
</script>

<svg
	aria-hidden="true"
	width="1"
	height="1"
	class="fs-absolute fl-flow-edges"
>
	{#each routed as { edge, source, target, from, to, path } (edge.id)}
		{@const selected = selection?.type === 'edge' && selection.id === edge.id}
		{@const lit = selected || traversed.includes(edge.id)}
		<g class="fl-flow-edges-group-edge">
			<GradientPath
				id={`edge-${edge.id}`}
				{from}
				{to}
				fromColor={edge.accent ?? ACTIONS[source.kind].accent}
				toColor={edge.accent ?? ACTIONS[target.kind].accent}
				{path}
				dash={edge.dash ? DASH_ARRAYS[edge.dash] : undefined}
				className={clsx(
					'fl-flow-edges-gradient-path',
					lit ? 'fl-flow-edges-gradient-path-1' : 'fl-flow-edges-gradient-path-2-2'
				)}
			/>
			{#if activeEdgeId === edge.id}
				<path
					d={path}
					fill="none"
					stroke="white"
					stroke-opacity={0.9}
					stroke-width={2}
					stroke-linecap="round"
					stroke-dasharray="4 8"
					class="fl-flow-edges-path"
				></path>
			{/if}
			<path
				d={path}
				fill="none"
				stroke="transparent"
				stroke-width={16}
				role="presentation"
				onpointerdown={(event) => onEdgePointerDown(edge.id, event)}
				class="fl-flow-edges-presentation"
			></path>
		</g>
	{/each}
	{#each open as { source, port, point } (portKey(source.id, port))}
		{@const from = outputPoint(source, sizes, port)}
		{#if snapKey !== portKey(source.id, port)}
			<GradientPath
				id={`stub-${source.id}-${port}`}
				{from}
				to={point}
				fromColor={ACTIONS[source.kind].accent}
				toColor="#ffffff"
				path={roundedPath(routeToPoint(source, port, point, sizes))}
				className="fl-flow-edges-gradient-path-2"
			/>
		{/if}
	{/each}
	{#if preview}
		<GradientPath
			id="edge-preview"
			from={preview.from}
			to={preview.to}
			fromColor={preview.fromColor}
			toColor={preview.toColor}
			path={roundedPath(
				routeEdge(
					{ point: preview.from, side: preview.fromSide },
					{ point: preview.to, side: preview.toSide }
				)
			)}
			className="fl-flow-edges-edge-preview"
		/>
	{/if}
</svg>
{#each labels as { id, point, port } (id)}
	<BranchLabel {point} {port} />
{/each}
{#each open as { source, port, point } (portKey(source.id, port))}
	{@const key = portKey(source.id, port)}
	{@const snapped = snapKey === key}
	{#if labelText[port]}
		<BranchLabel point={labelPoint(routeToPoint(source, port, point, sizes))} {port} />
	{/if}
	<span
		role="presentation"
		data-snapped={snapped || undefined}
		data-side={outputSide(source, port)}
		style={positionStyle(point)}
		onpointerdown={(event) => onEndpointPointerDown(source.id, port, event)}
		class="fs-row fs-ycenter fs-xcenter fs-text-black fl-flow-edges-presentation-2"
	>
		<ChevronDownIcon aria-hidden class="fl-flow-edges-chevron-down-icon" />
	</span>
{/each}
{#if selectedEdge}
	<div
		role="presentation"
		style={positionStyle(actionPoint(selectedEdge.points))}
		onpointerdown={(event) => event.stopPropagation()}
		class="fs-absolute fl-flow-edges-presentation-3"
	>
		<div class="fl-flow-edges-controls">
			<div class="fl-flow-edges-controls-row">
				<SelectField
					value={selectedEdge.edge.dash ?? 'solid'}
					options={DASHES}
					align="start"
					onChange={(value) => {
						checkpoint();
						updateEdge(selectedEdge.edge.id, { dash: value === 'solid' ? undefined : (value as Dash) });
					}}
				/>
				<Button variant="field" size="xs" onClick={onDeleteEdge}>Delete</Button>
			</div>
			<div class="fl-flow-edges-controls-row">
				<Button
					variant="field"
					size="xs"
					onClick={() => {
						checkpoint();
						updateEdge(selectedEdge.edge.id, { accent: undefined });
					}}
				>
					gradient
				</Button>
				{#each ACCENTS as tone (tone.id)}
					<button
						type="button"
						class="fl-flow-edges-swatch"
						style:--swatch={tone.value}
						title={tone.name}
						aria-label={tone.name}
						aria-pressed={selectedEdge.edge.accent === tone.value}
						onclick={() => {
							checkpoint();
							updateEdge(selectedEdge.edge.id, { accent: tone.value });
						}}
					></button>
				{/each}
			</div>
		</div>
	</div>
{/if}
