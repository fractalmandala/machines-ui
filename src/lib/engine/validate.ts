import { STEP_KINDS } from '$lib/core/values.js';
import type { FlowGraph, Problem } from './types.js';

/** The output ports a step has: what it declares, else a branch's two, else one `out`. */
export function portsOf(node: FlowGraph['nodes'][number]): string[] {
	return (node.outputs ?? (node.kind === 'branch' ? [{ id: 'true' }, { id: 'false' }] : [{ id: 'out' }])).map((p) => p.id);
}

/**
 * Everything wrong, and everything doubtful, about a graph. Errors stop a run; warnings do not.
 * Pure: no DOM, no store.
 */
export function validateGraph(graph: FlowGraph): Problem[] {
	const out: Problem[] = [];
	const problem = (p: Problem) => out.push(p);
	const ids = new Map<string, number>();

	for (const n of graph.nodes) ids.set(n.id, (ids.get(n.id) ?? 0) + 1);
	for (const [id, count] of ids) if (count > 1) problem({ severity: 'error', code: 'duplicate-node', nodeId: id, message: `Two steps share the id "${id}".` });

	const byId = new Map(graph.nodes.map((n) => [n.id, n]));
	const edgeIds = new Map<string, number>();

	for (const e of graph.edges) edgeIds.set(e.id, (edgeIds.get(e.id) ?? 0) + 1);
	for (const [id, count] of edgeIds) if (count > 1) problem({ severity: 'error', code: 'duplicate-edge', edgeId: id, message: `Two connections share the id "${id}".` });

	for (const n of graph.nodes) {
		if (!(STEP_KINDS as readonly string[]).includes(n.kind)) problem({ severity: 'error', code: 'unknown-kind', nodeId: n.id, message: `"${n.title || n.id}" has an unknown type "${n.kind}".` });
		if (!n.title?.trim()) problem({ severity: 'warning', code: 'no-title', nodeId: n.id, message: `Step "${n.id}" has no title.` });
	}

	const seen = new Set<string>();

	for (const e of graph.edges) {
		const source = byId.get(e.source);
		const target = byId.get(e.target);

		if (!source) problem({ severity: 'error', code: 'edge-source', edgeId: e.id, message: `A connection starts at "${e.source}", which is not a step.` });
		else if (!portsOf(source).includes(e.port)) problem({ severity: 'error', code: 'edge-port', edgeId: e.id, nodeId: source.id, message: `"${source.title}" has no "${e.port}" output, but a connection leaves from it.` });

		if (!target) problem({ severity: 'error', code: 'edge-target', edgeId: e.id, message: `A connection goes to "${e.target}", which is not a step.` });
		else if (target.input === false) problem({ severity: 'error', code: 'edge-into-no-input', edgeId: e.id, nodeId: target.id, message: `"${target.title}" has no input, but a connection goes into it.` });

		const key = `${e.source}:${e.port}>${e.target}`;

		if (seen.has(key)) problem({ severity: 'warning', code: 'duplicate-connection', edgeId: e.id, message: `The same connection is drawn twice, into "${target?.title ?? e.target}".` });
		seen.add(key);
	}

	const led = new Set(graph.edges.filter((e) => byId.has(e.source)).map((e) => e.target));

	for (const n of graph.nodes) {
		const hasInput = n.input !== false && n.kind !== 'trigger';

		if (hasInput && !led.has(n.id)) problem({ severity: 'error', code: 'unreached', nodeId: n.id, message: `Nothing leads into "${n.title}", so it can never run.` });
	}

	if (!graph.nodes.some((n) => n.kind === 'trigger')) problem({ severity: 'error', code: 'no-trigger', message: 'The workflow has no trigger, so nothing starts it.' });

	for (const n of graph.nodes) {
		if (n.kind !== 'branch') continue;

		for (const port of portsOf(n)) {
			if (!graph.edges.some((e) => e.source === n.id && e.port === port)) problem({ severity: 'warning', code: 'branch-open', nodeId: n.id, message: `"${n.title}" has nowhere to go on ${port.toUpperCase()}; a run that takes it ends there.` });
		}
	}

	// a loop that can never be left: every step in it sends only to other steps in it, and none is a branch
	const index = new Map<string, number>();
	const low = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	let counter = 0;
	const next = (id: string) => graph.edges.filter((e) => e.source === id && byId.has(e.target)).map((e) => e.target);

	const connect = (id: string) => {
		index.set(id, counter);
		low.set(id, counter);
		counter++;
		stack.push(id);
		onStack.add(id);

		for (const to of next(id)) {
			if (!index.has(to)) { connect(to); low.set(id, Math.min(low.get(id)!, low.get(to)!)); }
			else if (onStack.has(to)) low.set(id, Math.min(low.get(id)!, index.get(to)!));
		}

		if (low.get(id) === index.get(id)) {
			const group: string[] = [];
			let w: string;

			do { w = stack.pop()!; onStack.delete(w); group.push(w); } while (w !== id);

			const loops = group.length > 1 || next(id).includes(id);
			const inside = new Set(group);
			const leaves = group.some((g) => graph.edges.some((e) => e.source === g && !inside.has(e.target)) || byId.get(g)!.kind === 'branch');

			if (loops && !leaves) problem({ severity: 'error', code: 'loop-no-exit', nodeId: group[0], message: `These steps loop forever with no way out: ${group.map((g) => `"${byId.get(g)!.title}"`).join(', ')}.` });
		}
	};

	for (const n of graph.nodes) if (!index.has(n.id)) connect(n.id);

	return out;
}
