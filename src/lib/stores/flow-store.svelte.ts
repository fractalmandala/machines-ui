import { SEED_GRAPHS, type AutomationGraph } from '$lib/data/automations.js';
import type { Dash, Look, NodePort, PortId, PortSide, Status } from '$lib/core/values.js';
import type { FlowNodeBase, FlowNodeFrameOnly } from '$lib/components/flow/FlowNode.svelte';

export type { PortId, PortSide, NodePort };

export type ActionKind =
	| 'trigger'
	| 'send-email'
	| 'update-subscription'
	| 'send-webhook'
	| 'wait-until'
	| 'time-delay'
	| 'branch'
	| 'enroll'
	| 'agent'
	| 'transform'
	| 'read'
	| 'write'
	| 'review';

/**
 * How a node looks, kept with the node so it saves and exports with the flow. Every field is
 * optional: unset, a node draws as the card in its action's colour. The frame-only fields (dash,
 * movement, corners) apply while `look` is `frame`.
 */
export type NodeView = Pick<FlowNodeBase, 'badge' | 'statusLabel' | 'accent' | 'pad'> &
	FlowNodeFrameOnly & {
		/** `card` (the default) or the dashed `frame`. */
		look?: Look;
		/** Pins the status the node shows, instead of following the run. */
		status?: Status;
	};

export type FlowNodeData = {
	id: string;
	kind: ActionKind;
	x: number;
	y: number;
	title: string;
	description: string;
	rules?: Record<string, string>;
	fresh?: boolean;
	/** The side the input port is on, or `false` for none. Defaults by kind: the top, and none for a trigger. */
	input?: PortSide | false;
	/** The output ports and the side each leaves from. Defaults by kind: one `out` on the bottom, a branch's `true` and `false` on the bottom. */
	outputs?: NodePort[];
	/** The node's look. */
	view?: NodeView;
};

/**
 * A connection between two nodes: which node and output port it leaves from, and which node
 * it goes to. `accent` and `dash` are optional styling and never change how the graph runs.
 */
export type FlowEdge = {
	id: string;
	source: string;
	port: PortId;
	target: string;
	/** One colour for the whole edge. Defaults to a gradient from the source step's colour to the target's. */
	accent?: string;
	/** Draws the edge dashed, with any of the frame's dash rhythms. Defaults to a solid line. */
	dash?: Dash;
};

export type FlowSelection = { type: 'node' | 'edge'; id: string } | null;

export type FlowView = { x: number; y: number; zoom: number };

export type InspectorTab = 'build' | 'status' | 'logs';

export type RunStatus = 'idle' | 'running' | 'done';

export type RunState = {
	status: RunStatus;
	activeNodeId: string | null;
	activeEdgeId: string | null;
	visited: string[];
	traversed: string[];
	startedAt: number | null;
	finishedAt: number | null;
	count: number;
};

export type RunLog = {
	id: string;
	run: number;
	nodeId: string | null;
	time: number;
	level: 'info' | 'success' | 'warning';
	message: string;
};

type Snapshot = { nodes: FlowNodeData[]; edges: FlowEdge[] };

type SavedGraph = Snapshot & {
	view: FlowView;
	logs: RunLog[];
	runCount: number;
};

export const DEFAULT_VIEW: FlowView = { x: -200, y: 48, zoom: 1 };

const HISTORY_LIMIT = 100;
const LOG_LIMIT = 200;

const IDLE_RUN: RunState = {
	status: 'idle',
	activeNodeId: null,
	activeEdgeId: null,
	visited: [],
	traversed: [],
	startedAt: null,
	finishedAt: null,
	count: 0
};

const createId = () => crypto.randomUUID();

// Deep, reactive-free copy — needed because we mutate in place, so history and
// saved graphs must not alias the live arrays.
const clone = <T>(value: T): T => $state.snapshot(value) as T;

const settledRun = (run: RunState): RunState =>
	run.status === 'running' ? run : { ...IDLE_RUN, count: run.count };

const graphSnapshot = (): Snapshot => clone({ nodes: flow.nodes, edges: flow.edges });

const seed = SEED_GRAPHS.jev();

export const flow = $state({
	nodes: seed.nodes as FlowNodeData[],
	edges: seed.edges as FlowEdge[],
	graphId: 'jev',
	saved: {} as Record<string, SavedGraph>,
	view: { ...DEFAULT_VIEW } as FlowView,
	sizes: {} as Record<string, number>,
	selection: null as FlowSelection,
	inspector: null as { nodeId: string; tab: InspectorTab } | null,
	past: [] as Snapshot[],
	future: [] as Snapshot[],
	run: { ...IDLE_RUN } as RunState,
	logs: [] as RunLog[],
	fitRequest: 0,
	command: null as {
		type: 'fit' | 'reset' | 'focus';
		nodeId?: string;
		nonce: number;
	} | null
});

export function sendCommand(type: 'fit' | 'reset' | 'focus', nodeId?: string) {
	flow.command = { type, nodeId, nonce: (flow.command?.nonce ?? 0) + 1 };
}

export function setView(update: (view: FlowView) => FlowView) {
	flow.view = update(flow.view);
}

export function setSize(id: string, height: number) {
	if (flow.sizes[id] === height) return;
	flow.sizes[id] = height;
}

export function select(selection: FlowSelection) {
	const current = flow.selection;
	if (current?.id === selection?.id && current?.type === selection?.type) return;
	flow.selection = selection;
	// the step panel follows the selected step, and stays on it when the selection clears
	if (selection?.type === 'node') flow.inspector = { nodeId: selection.id, tab: flow.inspector?.tab ?? 'build' };
}

export function checkpoint() {
	flow.past = [...flow.past, graphSnapshot()].slice(-HISTORY_LIMIT);
	flow.future = [];
}

export function addNode(node: FlowNodeData, link?: { source: string; port: PortId } | null) {
	checkpoint();
	flow.nodes.push(node);
	if (link)
		flow.edges.push({
			id: createId(),
			source: link.source,
			port: link.port,
			target: node.id
		});
	flow.selection = { type: 'node', id: node.id };
	flow.run = settledRun(flow.run);
}

export function moveNode(id: string, x: number, y: number) {
	const node = flow.nodes.find((node) => node.id === id);
	if (node) {
		node.x = x;
		node.y = y;
	}
}

export function updateNode(
	id: string,
	patch: Partial<Pick<FlowNodeData, 'title' | 'description' | 'rules' | 'kind' | 'input' | 'outputs'>>
) {
	const node = flow.nodes.find((node) => node.id === id);
	if (node) Object.assign(node, patch);
}

/** Sets part of a node's look. A field set to `undefined` is removed, so it falls back to its default. */
export function updateView(id: string, patch: Partial<NodeView>) {
	const node = flow.nodes.find((node) => node.id === id);

	if (!node) return;

	const next: Record<string, unknown> = { ...node.view, ...patch };

	for (const key of Object.keys(next)) if (next[key] === undefined) delete next[key];

	node.view = Object.keys(next).length ? (next as NodeView) : undefined;
}

export function changeKind(
	id: string,
	kind: ActionKind,
	defaults: { title: string; description: string }
) {
	const node = flow.nodes.find((node) => node.id === id);
	if (!node || node.kind === kind) return;
	checkpoint();
	// a branch's ports are its own, so a kind change takes the new kind's ports
	Object.assign(node, { kind, rules: undefined, outputs: undefined, ...defaults });
	for (const edge of flow.edges) {
		if (edge.source !== id) continue;
		if (kind === 'branch' && edge.port === 'out') edge.port = 'true';
		else if (kind !== 'branch' && edge.port !== 'out') edge.port = 'out';
	}
	flow.run = settledRun(flow.run);
}

export function connect(source: string, port: PortId, target: string) {
	if (source === target) return;
	if (
		flow.edges.some(
			(edge) => edge.source === source && edge.port === port && edge.target === target
		)
	)
		return;
	checkpoint();
	const edge = { id: createId(), source, port, target };
	flow.edges.push(edge);
	flow.selection = { type: 'edge', id: edge.id };
	flow.run = settledRun(flow.run);
}

export function updateEdge(id: string, patch: Partial<Pick<FlowEdge, 'accent' | 'dash'>>) {
	const edge = flow.edges.find((edge) => edge.id === id);
	if (edge) Object.assign(edge, patch);
}

export function removeNode(id: string) {
	checkpoint();
	flow.nodes = flow.nodes.filter((node) => node.id !== id);
	flow.edges = flow.edges.filter((edge) => edge.source !== id && edge.target !== id);
	if (flow.selection?.id === id) flow.selection = null;
	if (flow.inspector?.nodeId === id) flow.inspector = null;
	flow.run = settledRun(flow.run);
}

export function removeSelection() {
	const selection = flow.selection;
	if (!selection) return;
	if (selection.type === 'node') {
		removeNode(selection.id);
		return;
	}
	checkpoint();
	flow.edges = flow.edges.filter((edge) => edge.id !== selection.id);
	flow.selection = null;
	flow.run = settledRun(flow.run);
}

export function undo() {
	const previous = flow.past.at(-1);
	if (!previous) return;
	flow.future = [graphSnapshot(), ...flow.future];
	flow.past = flow.past.slice(0, -1);
	const snapshot = clone(previous);
	flow.nodes = snapshot.nodes;
	flow.edges = snapshot.edges;
	flow.selection = null;
	if (!snapshot.nodes.some((node) => node.id === flow.inspector?.nodeId))
		flow.inspector = null;
}

export function redo() {
	const next = flow.future[0];
	if (!next) return;
	flow.past = [...flow.past, graphSnapshot()];
	flow.future = flow.future.slice(1);
	const snapshot = clone(next);
	flow.nodes = snapshot.nodes;
	flow.edges = snapshot.edges;
	flow.selection = null;
	if (!snapshot.nodes.some((node) => node.id === flow.inspector?.nodeId))
		flow.inspector = null;
}

export function openInspector(nodeId: string, tab?: InspectorTab) {
	flow.inspector = { nodeId, tab: tab ?? flow.inspector?.tab ?? 'build' };
	flow.selection = { type: 'node', id: nodeId };
}

export function setInspectorTab(tab: InspectorTab) {
	if (flow.inspector) flow.inspector.tab = tab;
}

export function closeInspector() {
	flow.inspector = null;
}

export function loadGraph(id: string, fallback: () => AutomationGraph) {
	if (flow.graphId === id) return;
	const current: SavedGraph = {
		nodes: clone(flow.nodes),
		edges: clone(flow.edges),
		view: clone(flow.view),
		logs: clone(flow.logs),
		runCount: flow.run.count
	};
	const next = flow.saved[id];
	const graph: SavedGraph = next ?? {
		...fallback(),
		view: { ...DEFAULT_VIEW },
		logs: [],
		runCount: 0
	};
	flow.saved[flow.graphId] = current;
	flow.graphId = id;
	flow.nodes = graph.nodes;
	flow.edges = graph.edges;
	flow.view = graph.view;
	flow.logs = graph.logs;
	flow.run = { ...IDLE_RUN, count: graph.runCount };
	flow.selection = null;
	flow.inspector = null;
	flow.past = [];
	flow.future = [];
	if (!next) flow.fitRequest++;
}

export function exportGraph(id: string): AutomationGraph {
	if (flow.graphId === id) return { nodes: flow.nodes, edges: flow.edges };
	const saved = flow.saved[id];
	if (saved) return { nodes: saved.nodes, edges: saved.edges };
	return SEED_GRAPHS[id]?.() ?? { nodes: [], edges: [] };
}

export function setRun(patch: Partial<RunState>) {
	Object.assign(flow.run, patch);
}

export function pushLog(log: Omit<RunLog, 'id' | 'time' | 'run'>) {
	flow.logs.push({
		...log,
		id: createId(),
		time: Date.now(),
		run: flow.run.count
	});
	if (flow.logs.length > LOG_LIMIT) flow.logs = flow.logs.slice(-LOG_LIMIT);
}

export function clearRun() {
	flow.run = { ...IDLE_RUN, count: flow.run.count };
}
