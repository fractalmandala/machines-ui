import type { FlowEdge, FlowNodeData } from '$lib/stores/flow-store.svelte';

/** The nodes and edges of a workflow: what the canvas draws and what a run walks. */
export type FlowGraph = { nodes: FlowNodeData[]; edges: FlowEdge[] };

/** What names a workflow, apart from its steps. */
export type FlowMeta = { id: string; name: string; description: string };

/** The latest test run, as it appears in an export. */
export type TestRunLog = {
	startedAt: number | null;
	finishedAt: number | null;
	logs: { level: string; message: string; nodeId: string | null; time: number }[];
};

/** The Workflow JSON file. `format` carries the version. */
export type FlowDocument = {
	format: 'machines.flow/1';
	id: string;
	name: string;
	description: string;
	nodes: {
		id: string;
		kind: string;
		title: string;
		description: string;
		position: { x: number; y: number };
		input?: string | false;
		outputs?: { id: string; side: string }[];
		rules?: Record<string, string>;
		view?: Record<string, unknown>;
	}[];
	edges: { id: string; source: string; port: string; target: string; accent?: string; dash?: string }[];
	testRun?: TestRunLog;
};

/** One thing wrong with a graph or a file. An `error` stops a run or an import; a `warning` does not. */
export type Problem = {
	severity: 'error' | 'warning';
	code: string;
	message: string;
	nodeId?: string;
	edgeId?: string;
	/** Where in the file, for import problems: `nodes[3].view.dash`. */
	path?: string;
};
