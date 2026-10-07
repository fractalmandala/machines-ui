// The edge router: given where a connection leaves one node and where it enters another,
// and which side of each node those ends sit on, it returns the corner points of an
// orthogonal route. Pure geometry: no components, no DOM, and the only import is a type.
//
// How it works: every end first steps straight out of its node (a short "stub"), so a
// connection always leaves and enters square to the node's edge. The router then joins
// the two stub ends with the simplest shape that never doubles back on itself and never
// cuts through the two nodes it connects. Fewest corners wins, then shortest, then the
// fixed candidate order (so the same input always gives the same route).

import type { PortSide } from './values.js';

export interface Point {
	x: number;
	y: number;
}

export interface Box {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** One end of a connection: the port's position, the side it faces, and optionally its node's bounds. */
export interface RouteEnd {
	point: Point;
	side: PortSide;
	/** The node's bounds. When given, routes are kept out of the node and detours clear its edges. */
	box?: Box;
}

export interface RouteOptions {
	/** How far a connection runs straight out of a port before it may turn. Default 40. */
	stub?: number;
	/** How far a detour keeps from the nodes it goes around. Default 40. */
	clear?: number;
	/** Facing ends that are off-line by less than this are joined by one straight line. Default 28. */
	straight?: number;
}

/** Defaults, shared with anything that has to agree with the router (placement, dangling stubs). */
export const ROUTE_DEFAULTS = { stub: 40, clear: 40, straight: 28 } as const;

/** Facing ends closer than this skip the straight-line shortcut and use the small stepped route. */
const MIN_FACING_GAP = 24;

const NORMALS: Record<PortSide, Point> = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 }
};

/** The unit vector pointing out of a node on the given side. */
export const sideNormal = (side: PortSide): Point => NORMALS[side];

const same = (a: Point, b: Point) => Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;

/** Drops repeated points and points in the middle of a run that carries straight on. */
function simplify(points: Point[]): Point[] {
	const unique = points.filter((point, index) => index === 0 || !same(point, points[index - 1]));
	return unique.filter((point, index) => {
		if (index === 0 || index === unique.length - 1) return true;
		const before = unique[index - 1];
		const after = unique[index + 1];

		const cross = (point.x - before.x) * (after.y - point.y) - (point.y - before.y) * (after.x - point.x);
		const forward = (point.x - before.x) * (after.x - point.x) + (point.y - before.y) * (after.y - point.y) > 0;

		// a middle point goes only when the line carries straight on through it; a turn or a
		// doubling back stays, so the validity check can see it
		return cross !== 0 || !forward;
	});
}

const direction = (from: Point, to: Point): Point => ({
	x: Math.sign(to.x - from.x),
	y: Math.sign(to.y - from.y)
});

/** True when the segment passes through the inside of the box (touching its edge is fine). */
function cuts(from: Point, to: Point, box: Box): boolean {
	const left = box.x;
	const right = box.x + box.width;
	const top = box.y;
	const bottom = box.y + box.height;

	if (from.x === to.x) {
		const [low, high] = from.y < to.y ? [from.y, to.y] : [to.y, from.y];

		return from.x > left && from.x < right && low < bottom && high > top;
	}

	const [low, high] = from.x < to.x ? [from.x, to.x] : [to.x, from.x];

	return from.y > top && from.y < bottom && low < right && high > left;
}

function isValid(path: Point[], boxes: Box[]): boolean {
	for (let index = 1; index < path.length; index++) {
		const step = direction(path[index - 1], path[index]);

		// every segment runs along one axis
		if (step.x !== 0 && step.y !== 0) return false;

		// no doubling back along the previous segment
		if (index > 1) {
			const before = direction(path[index - 2], path[index - 1]);

			if (before.x === -step.x && before.y === -step.y) return false;
		}

		// no cutting through the nodes at either end
		for (const box of boxes) if (cuts(path[index - 1], path[index], box)) return false;
	}

	return true;
}

const length = (path: Point[]) =>
	path.reduce((sum, point, index) => (index ? sum + Math.abs(point.x - path[index - 1].x) + Math.abs(point.y - path[index - 1].y) : 0), 0);

/**
 * The corner points of the route from `from` to `to`, first point `from.point`, last point
 * `to.point`. Round the corners with the canvas's path function when drawing.
 */
export function routeEdge(from: RouteEnd, to: RouteEnd, options: RouteOptions = {}): Point[] {
	const stub = options.stub ?? ROUTE_DEFAULTS.stub;
	const clear = options.clear ?? ROUTE_DEFAULTS.clear;
	const straight = options.straight ?? ROUTE_DEFAULTS.straight;

	const s = from.point;
	const t = to.point;
	const na = NORMALS[from.side];
	const nb = NORMALS[to.side];
	const facing = na.x === -nb.x && na.y === -nb.y;
	const dx = t.x - s.x;
	const dy = t.y - s.y;
	// how far apart the two ends are along the direction the source leaves in
	const gap = dx * na.x + dy * na.y;
	const lateral = Math.abs(dx * na.y - dy * na.x);

	// facing ends with room between them and little sideways offset: one straight line
	if (facing && gap >= MIN_FACING_GAP && lateral < straight) return [s, t];

	// facing ends with little room share it between the two stubs
	const run = facing && gap > 0 ? Math.min(stub, gap / 2) : stub;
	const a = { x: s.x + na.x * run, y: s.y + na.y * run };
	const b = { x: t.x + nb.x * run, y: t.y + nb.y * run };

	const boxes = [from.box, to.box].filter((box): box is Box => Boolean(box));
	const xs = [a.x, b.x, ...boxes.flatMap((box) => [box.x, box.x + box.width])];
	const ys = [a.y, b.y, ...boxes.flatMap((box) => [box.y, box.y + box.height])];
	const lanes = {
		right: Math.max(...xs) + clear,
		left: Math.min(...xs) - clear,
		bottom: Math.max(...ys) + clear,
		top: Math.min(...ys) - clear
	};

	// Candidate shapes between the two stub ends, in tie-break order: a turn right after the
	// source's stub comes first, which keeps the familiar elbow just below a source node.
	const between: Point[][] = [
		[a, b],
		[a, { x: b.x, y: a.y }, b],
		[a, { x: a.x, y: b.y }, b]
	];

	for (const x of [(a.x + b.x) / 2, lanes.right, lanes.left]) {
		between.push([a, { x, y: a.y }, { x, y: b.y }, b]);
	}

	for (const y of [a.y, b.y, (a.y + b.y) / 2, lanes.bottom, lanes.top]) {
		between.push([a, { x: a.x, y }, { x: b.x, y }, b]);
	}

	// four-segment shapes for the cases three cannot reach: leave, run to a lane, cross, enter
	for (const lane of [lanes.right, lanes.left]) {
		for (const cross of [(a.y + b.y) / 2, lanes.bottom, lanes.top]) {
			between.push([a, { x: lane, y: a.y }, { x: lane, y: cross }, { x: b.x, y: cross }, b]);
		}
	}

	for (const lane of [lanes.bottom, lanes.top]) {
		for (const cross of [(a.x + b.x) / 2, lanes.right, lanes.left]) {
			between.push([a, { x: a.x, y: lane }, { x: cross, y: lane }, { x: cross, y: b.y }, b]);
		}
	}

	let best: Point[] | undefined;
	let bestCorners = Infinity;
	let bestLength = Infinity;

	for (const candidate of between) {
		const path = simplify([s, ...candidate, t]);

		if (!isValid(path, boxes)) continue;

		const corners = path.length - 2;
		const total = length(path);

		if (corners < bestCorners || (corners === bestCorners && total < bestLength - 1e-6)) {
			best = path;
			bestCorners = corners;
			bestLength = total;
		}
	}

	// no clean shape exists (the two nodes overlap): fall back to the plain stepped route
	return best ?? simplify([s, a, { x: b.x, y: a.y }, b, t]);
}

/**
 * Where a label (such as TRUE or FALSE) sits on a route. A one-elbow route keeps the label on
 * its horizontal run, just right of centre; a straight line takes the middle; anything else takes
 * the middle of its longest segment.
 */
export function routeLabelPoint(points: Point[]): Point {
	if (points.length === 4) {
		return { x: points[1].x + (points[2].x - points[1].x) * 0.53, y: points[1].y };
	}

	let longest = 0;
	let at = 0;

	for (let index = 1; index < points.length; index++) {
		const size = Math.abs(points[index].x - points[index - 1].x) + Math.abs(points[index].y - points[index - 1].y);

		if (size > longest) {
			longest = size;
			at = index;
		}
	}

	return { x: (points[at - 1].x + points[at].x) / 2, y: (points[at - 1].y + points[at].y) / 2 };
}
