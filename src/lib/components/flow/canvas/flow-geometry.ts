import type {
	PortId,
	PortSide,
	FlowEdge,
	FlowNodeData,
	FlowView
} from '$lib/stores/flow-store.svelte';
import type { NodePort } from '$lib/core/values.js';
import { routeEdge, routeLabelPoint, sideNormal, type Box, type Point } from '$lib/core/route.js';

export type { Point };

export type OpenPort = { source: FlowNodeData; port: PortId; point: Point };

export const NODE_WIDTH = 400;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 1;
export const GRID_SIZE = 10.86;

const NODE_GAP = 80;
const BRANCH_SPREAD = 200;
const BRANCH_END = 87;
const OUT_END = 56;
const ELBOW = 40;
const CORNER = 8;

export function estimateHeight(node: FlowNodeData) {
	return node.description.length > 56 ? 145 : 121;
}

export function nodeHeight(node: FlowNodeData, sizes: Record<string, number>) {
	return sizes[node.id] ?? estimateHeight(node);
}

/** The node's rectangle on the canvas. Width is fixed for now; measured width will change only this. */
export function nodeBox(node: FlowNodeData, sizes: Record<string, number>): Box {
	return { x: node.x, y: node.y, width: NODE_WIDTH, height: nodeHeight(node, sizes) };
}

const OPPOSITE: Record<PortSide, PortSide> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

/** The side facing the other way: a port on one side meets an input on its opposite. */
export const oppositeSide = (side: PortSide): PortSide => OPPOSITE[side];

/** The side the node's input is on, or `false` when it has none. A trigger has none unless it says otherwise. */
export function inputSide(node: FlowNodeData): PortSide | false {
	return node.input ?? (node.kind === 'trigger' ? false : 'top');
}

export function hasInput(node: FlowNodeData) {
	return inputSide(node) !== false;
}

/** The node's output ports and the side each leaves from. */
export function outputsOf(node: FlowNodeData): NodePort[] {
	return (
		node.outputs ??
		(node.kind === 'branch'
			? [
					{ id: 'true', side: 'bottom' },
					{ id: 'false', side: 'bottom' }
				]
			: [{ id: 'out', side: 'bottom' }])
	);
}

export function portsOf(node: FlowNodeData): PortId[] {
	return outputsOf(node).map((port) => port.id);
}

export function outputSide(node: FlowNodeData, port: PortId): PortSide {
	return outputsOf(node).find((item) => item.id === port)?.side ?? 'bottom';
}

/** A point along one side of a rectangle; `at` is how far along it, from the start (0.5 is the middle). */
function sideAnchor(box: Box, side: PortSide, at = 0.5): Point {
	if (side === 'top') return { x: box.x + box.width * at, y: box.y };
	if (side === 'bottom') return { x: box.x + box.width * at, y: box.y + box.height };
	if (side === 'left') return { x: box.x, y: box.y + box.height * at };
	return { x: box.x + box.width, y: box.y + box.height * at };
}

/** The ports on one side in drawing order: the input first, then the outputs. */
function portsOnSide(node: FlowNodeData, side: PortSide): ('in' | PortId)[] {
	return [
		...(inputSide(node) === side ? (['in'] as const) : []),
		...outputsOf(node)
			.filter((port) => port.side === side)
			.map((port) => port.id)
	];
}

/** Where a port sits. Ports sharing a side spread evenly along it, the way `FlowNode` draws them. */
function portPoint(node: FlowNodeData, sizes: Record<string, number>, port: 'in' | PortId): Point {
	const side = port === 'in' ? inputSide(node) || 'top' : outputSide(node, port);
	const ports = portsOnSide(node, side);
	const index = Math.max(0, ports.indexOf(port));

	return sideAnchor(nodeBox(node, sizes), side, (index + 1) / (ports.length + 1));
}

/** Where connections enter the node. */
export function inputPoint(node: FlowNodeData, sizes: Record<string, number>): Point {
	return portPoint(node, sizes, 'in');
}

/** Where a connection leaves the node from the given output port. */
export function outputPoint(
	node: FlowNodeData,
	sizes: Record<string, number>,
	port: PortId = 'out'
): Point {
	return portPoint(node, sizes, port);
}

/** Along-the-side direction a branch's `true` and `false` ports fan out in: `true` one way, `false` the other. */
function across(side: PortSide): Point {
	const normal = sideNormal(side);

	return { x: normal.y, y: -normal.x };
}

/** Where an unconnected port's dangling stub ends: straight out of its side, fanned apart for a branch. */
export function endpointPoint(
	node: FlowNodeData,
	sizes: Record<string, number>,
	port: PortId
): Point {
	const side = outputSide(node, port);
	// stubs fan out from the middle of the side, wherever the port's own dot sits
	const origin = sideAnchor(nodeBox(node, sizes), side);
	const normal = sideNormal(side);

	if (port === 'out') {
		return { x: origin.x + normal.x * OUT_END, y: origin.y + normal.y * OUT_END };
	}

	const fan = across(side);
	const sign = port === 'true' ? -1 : 1;

	return {
		x: origin.x + normal.x * BRANCH_END + fan.x * BRANCH_SPREAD * sign,
		y: origin.y + normal.y * BRANCH_END + fan.y * BRANCH_SPREAD * sign
	};
}

export function openPorts(
	nodes: FlowNodeData[],
	edges: FlowEdge[],
	sizes: Record<string, number>
): OpenPort[] {
	return nodes.flatMap((node) =>
		portsOf(node)
			.filter((port) => !edges.some((edge) => edge.source === node.id && edge.port === port))
			.map((port) => ({
				source: node,
				port,
				point: endpointPoint(node, sizes, port)
			}))
	);
}

/** Where the input of a node placed at `placement` sits, on the given side (the inverse of `placeInput`). */
export function inputAt(placement: Point, side: PortSide): Point {
	return sideAnchor({ x: placement.x, y: placement.y, width: NODE_WIDTH, height: 121 }, side);
}

/** Top-left corner for a new node whose input sits at `point` on the given side. */
function placeInput(point: Point, side: PortSide): Point {
	if (side === 'top') return { x: point.x - NODE_WIDTH / 2, y: point.y };
	if (side === 'bottom') return { x: point.x - NODE_WIDTH / 2, y: point.y - 121 };
	if (side === 'left') return { x: point.x, y: point.y - 121 / 2 };
	return { x: point.x - NODE_WIDTH, y: point.y - 121 / 2 };
}

/** Where a new node goes when added from a port: beyond the port, its input facing back at it. */
export function placementFor(
	source: FlowNodeData,
	port: PortId,
	sizes: Record<string, number>
): Point {
	const side = outputSide(source, port);
	const origin = sideAnchor(nodeBox(source, sizes), side);
	const normal = sideNormal(side);
	const fan = across(side);
	const offset =
		port === 'true' ? -(BRANCH_SPREAD + 20) : port === 'false' ? BRANCH_SPREAD + 20 : 0;
	const drop = port === 'out' ? NODE_GAP : NODE_GAP + ELBOW;

	return placeInput(
		{
			x: origin.x + normal.x * drop + fan.x * offset,
			y: origin.y + normal.y * drop + fan.y * offset
		},
		oppositeSide(side)
	);
}

export function freePlacement(
	point: Point,
	nodes: FlowNodeData[],
	sizes: Record<string, number>
): Point {
	const overlaps = (candidate: Point) =>
		nodes.some(
			(node) =>
				candidate.x < node.x + NODE_WIDTH + 24 &&
				candidate.x + NODE_WIDTH + 24 > node.x &&
				candidate.y < node.y + nodeHeight(node, sizes) + 24 &&
				candidate.y + 145 > node.y
		);
	let candidate = point;
	for (let step = 0; step < 24 && overlaps(candidate); step++) {
		candidate = { x: candidate.x + NODE_WIDTH + 40, y: candidate.y };
	}
	return candidate;
}

/** The route of a connection from a node's output port to another node's input. */
export function routeBetween(
	source: FlowNodeData,
	port: PortId,
	target: FlowNodeData,
	sizes: Record<string, number>
): Point[] {
	return routeEdge(
		{
			point: outputPoint(source, sizes, port),
			side: outputSide(source, port),
			box: nodeBox(source, sizes)
		},
		{
			point: inputPoint(target, sizes),
			side: inputSide(target) || 'top',
			box: nodeBox(target, sizes)
		}
	);
}

/** The route from a node's output port to a free point, such as a dangling stub's end or the pointer. */
export function routeToPoint(
	source: FlowNodeData,
	port: PortId,
	point: Point,
	sizes: Record<string, number>
): Point[] {
	const side = outputSide(source, port);

	return routeEdge(
		{ point: outputPoint(source, sizes, port), side, box: nodeBox(source, sizes) },
		{ point, side: oppositeSide(side) }
	);
}

export type SnapBox = { x: number; y: number; width: number; height: number };

function alignAxis(moving: SnapBox, others: SnapBox[], tolerance: number, axis: 'x' | 'y'): number {
	const center = axis === 'x' ? moving.x + moving.width / 2 : moving.y + moving.height / 2;
	let best = 0;
	let closest = tolerance;

	for (const other of others) {
		const otherCenter = axis === 'x' ? other.x + other.width / 2 : other.y + other.height / 2;
		const delta = otherCenter - center;
		if (Math.abs(delta) > closest) continue;
		closest = Math.abs(delta);
		best = delta;
	}

	return best;
}

export function snapToNodes(moving: SnapBox, others: SnapBox[], tolerance: number): Point {
	return {
		x: moving.x + alignAxis(moving, others, tolerance, 'x'),
		y: moving.y + alignAxis(moving, others, tolerance, 'y')
	};
}

export function roundedPath(points: Point[]) {
	const [first, ...rest] = points;
	let path = `M${first.x} ${first.y}`;
	for (let index = 0; index < rest.length; index++) {
		const corner = rest[index];
		const next = rest[index + 1];
		if (!next) {
			path += ` L${corner.x} ${corner.y}`;
			break;
		}
		const previous = points[index];
		const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
		const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
		const radius = Math.min(CORNER, inLength / 2, outLength / 2);
		if (radius < 0.5) {
			path += ` L${corner.x} ${corner.y}`;
			continue;
		}
		const inX = (corner.x - previous.x) / inLength;
		const inY = (corner.y - previous.y) / inLength;
		const outX = (next.x - corner.x) / outLength;
		const outY = (next.y - corner.y) / outLength;
		const sweep = inX * outY - inY * outX > 0 ? 1 : 0;
		path += ` L${corner.x - inX * radius} ${corner.y - inY * radius}`;
		path += ` A${radius} ${radius} 0 0 ${sweep} ${corner.x + outX * radius} ${corner.y + outY * radius}`;
	}
	return path;
}

export const labelPoint = routeLabelPoint;

/** The middle of a route's last segment: where the delete button for a selected edge sits. */
export function actionPoint(points: Point[]): Point {
	const last = points.at(-1)!;
	const beforeLast = points.at(-2)!;

	return { x: (last.x + beforeLast.x) / 2, y: (last.y + beforeLast.y) / 2 };
}

export function toWorld(
	clientX: number,
	clientY: number,
	rect: DOMRect,
	view: FlowView
): Point {
	return {
		x: (clientX - rect.left - rect.width / 2 - view.x) / view.zoom,
		y: (clientY - rect.top - view.y) / view.zoom
	};
}

export function clampZoom(zoom: number) {
	return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function zoomAround(
	view: FlowView,
	zoom: number,
	localX: number,
	localY: number,
	width: number
): FlowView {
	const next = clampZoom(zoom);
	const worldX = (localX - width / 2 - view.x) / view.zoom;
	const worldY = (localY - view.y) / view.zoom;
	return {
		zoom: next,
		x: localX - width / 2 - worldX * next,
		y: localY - worldY * next
	};
}
