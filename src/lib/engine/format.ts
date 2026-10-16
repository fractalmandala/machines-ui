import { DASHES, LOOKS, MOTIONS, PADS, PORT_IDS, PORT_SIDES, STATUSES, STEP_KINDS } from '$lib/core/values.js';
import type { FlowEdge, FlowNodeData, NodeView } from '$lib/stores/flow-store.svelte';
import type { FlowDocument, FlowGraph, FlowMeta, Problem, TestRunLog } from './types.js';
import { validateGraph } from './validate.js';

export const FORMAT = 'machines.flow/1';

/** Step types that were renamed before the format was frozen. A file that uses an old name is read as the new one. */
const RENAMED: Record<string, string> = { 'update-subscription': 'update-record', enroll: 'run-workflow' };

/** What `importFlow` throws when the file cannot be read as a workflow. `problems` says what and where. */
export class FlowParseError extends Error {
	problems: Problem[];

	constructor(problems: Problem[]) {
		super(problems[0]?.message ?? 'Not a workflow file.');
		this.name = 'FlowParseError';
		this.problems = problems;
	}
}

export type ExportOptions = {
	/** Add the latest test run's log. Default false. */
	testRun?: TestRunLog | null;
};

const clean = <T extends object>(o: T): T => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/** The Workflow JSON document for a graph. Lossless: `importFlow` gives back the same graph. */
export function exportFlow(graph: FlowGraph, meta: FlowMeta, options: ExportOptions = {}): FlowDocument {
	return clean({
		format: FORMAT,
		id: meta.id,
		name: meta.name,
		description: meta.description,
		nodes: graph.nodes.map((n) =>
			clean({
				id: n.id,
				kind: n.kind,
				title: n.title,
				description: n.description,
				position: { x: n.x, y: n.y },
				input: n.input,
				outputs: n.outputs?.map((p) => ({ id: p.id, side: p.side })),
				rules: n.rules && Object.keys(n.rules).length ? { ...n.rules } : undefined,
				view: n.view && Object.keys(n.view).length ? { ...n.view } : undefined
			})
		),
		edges: graph.edges.map((e) => clean({ id: e.id, source: e.source, port: e.port, target: e.target, accent: e.accent, dash: e.dash })),
		testRun: options.testRun ?? undefined
	}) as FlowDocument;
}

// what a node's `view` may hold, and how to tell a good value from a bad one
const VIEW: Record<string, (v: unknown) => boolean> = {
	look: (v) => (LOOKS as readonly unknown[]).includes(v),
	badge: (v) => typeof v === 'string',
	statusLabel: (v) => typeof v === 'string' || v === false,
	accent: (v) => typeof v === 'string',
	pad: (v) => (PADS as readonly unknown[]).includes(v),
	status: (v) => (STATUSES as readonly unknown[]).includes(v),
	dash: (v) => (DASHES as readonly unknown[]).includes(v),
	motion: (v) => (MOTIONS as readonly unknown[]).includes(v),
	speed: (v) => typeof v === 'number' && v > 0,
	easing: (v) => typeof v === 'string',
	pauseOnHover: (v) => typeof v === 'boolean',
	cornerBlink: (v) => typeof v === 'boolean',
	corner: (v) => typeof v === 'string'
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Reads a Workflow JSON file (text or an already parsed object) into a graph.
 * Throws `FlowParseError` when it is not a workflow; otherwise returns what it understood and
 * a warning for everything it had to drop or rename.
 */
export function importFlow(input: string | unknown): { graph: FlowGraph; meta: FlowMeta; testRun?: TestRunLog; warnings: Problem[] } {
	let doc: unknown = input;

	if (typeof input === 'string') {
		try {
			doc = JSON.parse(input);
		} catch (e) {
			throw new FlowParseError([{ severity: 'error', code: 'not-json', message: `This is not valid JSON: ${(e as Error).message}` }]);
		}
	}

	if (!isObject(doc)) throw new FlowParseError([{ severity: 'error', code: 'not-object', message: 'A workflow file is a JSON object.' }]);

	const format = typeof doc.format === 'string' ? doc.format : '';
	const major = /^machines\.flow\/(\d+)/.exec(format)?.[1];

	if (!major) throw new FlowParseError([{ severity: 'error', code: 'no-format', path: 'format', message: 'This file has no "format": "machines.flow/1", so it is not a workflow file from this editor.' }]);
	if (major !== '1') throw new FlowParseError([{ severity: 'error', code: 'newer-format', path: 'format', message: `This file is ${format}; this version reads machines.flow/1.` }]);

	const errors: Problem[] = [];
	const warnings: Problem[] = [];
	const fail = (path: string, code: string, message: string) => errors.push({ severity: 'error', code, path, message });
	const warn = (path: string, code: string, message: string, nodeId?: string) => warnings.push({ severity: 'warning', code, path, message, nodeId });

	if (!Array.isArray(doc.nodes)) fail('nodes', 'nodes', '"nodes" must be a list of steps.');
	if (!Array.isArray(doc.edges)) fail('edges', 'edges', '"edges" must be a list of connections.');

	const nodes: FlowNodeData[] = [];
	const edges: FlowEdge[] = [];

	(Array.isArray(doc.nodes) ? doc.nodes : []).forEach((raw, i) => {
		const at = `nodes[${i}]`;

		if (!isObject(raw)) return fail(at, 'node', 'A step must be an object.');
		if (typeof raw.id !== 'string' || !raw.id) return fail(`${at}.id`, 'node-id', 'A step needs a text "id".');

		let kind = String(raw.kind);

		if (RENAMED[kind]) {
			warn(`${at}.kind`, 'renamed-kind', `"${raw.id}": the step type "${kind}" is now "${RENAMED[kind]}".`, raw.id);
			kind = RENAMED[kind];
		}

		if (!(STEP_KINDS as readonly string[]).includes(kind)) return fail(`${at}.kind`, 'node-kind', `"${raw.id}" has an unknown step type "${kind}".`);

		const pos = isObject(raw.position) ? raw.position : {};

		if (typeof pos.x !== 'number' || typeof pos.y !== 'number') fail(`${at}.position`, 'node-position', `"${raw.id}" needs a position with a number x and y.`);

		const node: FlowNodeData = { id: raw.id, kind: kind as FlowNodeData['kind'], x: Number(pos.x) || 0, y: Number(pos.y) || 0, title: String(raw.title ?? ''), description: String(raw.description ?? '') };

		if (raw.input !== undefined) {
			if (raw.input === false || (PORT_SIDES as readonly unknown[]).includes(raw.input)) node.input = raw.input as FlowNodeData['input'];
			else warn(`${at}.input`, 'input', `"${raw.id}": "input" must be top, right, bottom, left or false; ignored.`, raw.id);
		}

		if (raw.outputs !== undefined) {
			const ok = Array.isArray(raw.outputs) && raw.outputs.every((p) => isObject(p) && (PORT_IDS as readonly unknown[]).includes(p.id) && (PORT_SIDES as readonly unknown[]).includes(p.side));

			if (ok) node.outputs = (raw.outputs as { id: never; side: never }[]).map((p) => ({ id: p.id, side: p.side }));
			else warn(`${at}.outputs`, 'outputs', `"${raw.id}": "outputs" must be a list of { id, side }; ignored.`, raw.id);
		}

		if (raw.rules !== undefined) {
			if (isObject(raw.rules) && Object.values(raw.rules).every((v) => typeof v === 'string')) node.rules = { ...(raw.rules as Record<string, string>) };
			else warn(`${at}.rules`, 'rules', `"${raw.id}": "rules" must be text values only; ignored.`, raw.id);
		}

		if (raw.view !== undefined) {
			if (!isObject(raw.view)) warn(`${at}.view`, 'view', `"${raw.id}": "view" must be an object; ignored.`, raw.id);
			else {
				const view: Record<string, unknown> = {};

				for (const [key, value] of Object.entries(raw.view)) {
					if (!VIEW[key]) warn(`${at}.view.${key}`, 'view-key', `"${raw.id}": "${key}" is not a look setting; dropped.`, raw.id);
					else if (!VIEW[key](value)) warn(`${at}.view.${key}`, 'view-value', `"${raw.id}": "${key}" is set to ${JSON.stringify(value)}, which is not allowed; dropped.`, raw.id);
					else view[key] = value;
				}

				if (Object.keys(view).length) node.view = view as NodeView;
			}
		}

		nodes.push(node);
	});

	(Array.isArray(doc.edges) ? doc.edges : []).forEach((raw, i) => {
		const at = `edges[${i}]`;

		if (!isObject(raw)) return fail(at, 'edge', 'A connection must be an object.');
		if (typeof raw.id !== 'string' || typeof raw.source !== 'string' || typeof raw.target !== 'string') return fail(at, 'edge-fields', 'A connection needs a text "id", "source" and "target".');
		if (!(PORT_IDS as readonly unknown[]).includes(raw.port)) return fail(`${at}.port`, 'edge-port', `Connection "${raw.id}" leaves from "${raw.port}", which is not an output (out, true or false).`);

		const edge: FlowEdge = { id: raw.id, source: raw.source, port: raw.port as FlowEdge['port'], target: raw.target };

		if (typeof raw.accent === 'string') edge.accent = raw.accent;
		if (raw.dash !== undefined) {
			if ((DASHES as readonly unknown[]).includes(raw.dash)) edge.dash = raw.dash as FlowEdge['dash'];
			else warn(`${at}.dash`, 'edge-dash', `Connection "${raw.id}": "dash" is ${JSON.stringify(raw.dash)}, which is not allowed; dropped.`);
		}

		edges.push(edge);
	});

	if (errors.length) throw new FlowParseError(errors);

	const graph = { nodes, edges };

	// problems with how the steps join up are reported as the graph's own, so a file that reads fine but cannot run says so
	for (const p of validateGraph(graph)) warnings.push({ ...p, path: p.nodeId ? `step ${p.nodeId}` : p.edgeId ? `connection ${p.edgeId}` : undefined });

	const meta: FlowMeta = { id: String(doc.id ?? 'imported'), name: String(doc.name ?? 'Imported workflow'), description: String(doc.description ?? '') };
	const testRun = isObject(doc.testRun) ? (doc.testRun as unknown as TestRunLog) : undefined;

	return { graph, meta, testRun, warnings };
}
