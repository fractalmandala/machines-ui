import { toast } from 'svelte-sonner';
import {
	clearRun,
	openInspector,
	pushLog,
	setRun,
	flow,
	type PortId,
	type FlowNodeData
} from '$lib/stores/flow-store.svelte';
import { ACTIONS } from './flow-actions.js';

const STEP_DURATION = 720;
const EDGE_DURATION = 420;
const MAX_STEPS = 40;

let token = 0;
let clearTimer: number | null = null;

function wait(duration: number, run: number, graph: string) {
	return new Promise<boolean>((resolve) =>
		window.setTimeout(() => resolve(run === token && flow.graphId === graph), duration)
	);
}

function completion(node: FlowNodeData) {
	switch (node.kind) {
		case 'trigger':
			return `Run started: “${node.title}”`;
		case 'send-email':
			return `Sent “${node.title}” to the team`;
		case 'update-subscription':
			return `Applied “${node.title}” to the record`;
		case 'send-webhook':
			return `POST ${node.rules?.url ?? 'https://hooks.example.com/notify'} responded 200 OK in 184ms`;
		case 'wait-until':
			return `Would wait until ${node.title} — skipped in test run`;
		case 'time-delay':
			return `${node.title} — fast-forwarded in test run`;
		case 'enroll':
			return `Started “${node.title}”`;
		case 'branch':
			return 'Evaluated branch conditions';
		case 'agent':
			return `${node.rules?.model ?? 'Model'} answered “${node.title}” in 1.2s`;
		case 'transform':
			return `${node.rules?.from ?? 'Input'} → ${node.rules?.to ?? 'output'}: “${node.title}” done`;
		case 'read':
			return `Read ${node.rules?.source ?? 'the source'} (4.1 KB)`;
		case 'write':
			return `Wrote ${node.rules?.target ?? 'the output'}`;
		case 'review':
			return `${node.rules?.check ?? 'Check'} passed`;
	}
}

function roots() {
	const { nodes, edges } = flow;
	const triggers = nodes.filter((node) => node.kind === 'trigger');
	if (triggers.length) return triggers;
	return nodes.filter((node) => !edges.some((edge) => edge.target === node.id));
}

export function stopRun() {
	token += 1;
	clearRun();
}

export async function startRun() {
	const state = flow;
	if (state.run.status === 'running') return;
	if (clearTimer) window.clearTimeout(clearTimer);
	const run = ++token;
	const graph = state.graphId;
	const queue = roots().map((node) => node.id);
	if (!queue.length) {
		toast('Nothing to run yet', {
			description: 'Drag a trigger onto the canvas to start a flow.'
		});
		return;
	}

	const startedAt = Date.now();
	const count = state.run.count + 1;
	setRun({
		status: 'running',
		activeNodeId: null,
		activeEdgeId: null,
		visited: [],
		traversed: [],
		startedAt,
		finishedAt: null,
		count
	});
	pushLog({
		nodeId: null,
		level: 'info',
		message: `Test run #${count} started`
	});

	const visited: string[] = [];
	const traversed: string[] = [];
	const paths: string[] = [];
	let steps = 0;

	while (queue.length && steps < MAX_STEPS) {
		const nodeId = queue.shift()!;
		const node = flow.nodes.find((item) => item.id === nodeId);
		if (!node || visited.includes(nodeId)) continue;
		steps += 1;

		setRun({ activeNodeId: nodeId, activeEdgeId: null });
		pushLog({
			nodeId,
			level: 'info',
			message: `${ACTIONS[node.kind].label} started`
		});
		if (!(await wait(STEP_DURATION, run, graph))) return;

		visited.push(nodeId);
		setRun({ visited: [...visited] });

		const { edges } = flow;
		let port: PortId = 'out';
		if (node.kind === 'branch') {
			port = Math.random() < 0.6 ? 'true' : 'false';
			paths.push(port.toUpperCase());
			pushLog({
				nodeId,
				level: 'success',
				message: `Conditions evaluated → ${port.toUpperCase()} path`
			});
		} else {
			pushLog({
				nodeId,
				level: 'success',
				message: completion(node)
			});
		}

		const outgoing = edges.filter((edge) => edge.source === nodeId && edge.port === port);
		if (node.kind === 'branch' && !outgoing.length) {
			pushLog({
				nodeId,
				level: 'warning',
				message: `The ${port.toUpperCase()} path has no next step — the run ends here`
			});
		}

		for (const edge of outgoing) {
			setRun({ activeEdgeId: edge.id, activeNodeId: null });
			if (!(await wait(EDGE_DURATION, run, graph))) return;
			traversed.push(edge.id);
			setRun({ traversed: [...traversed] });
			queue.push(edge.target);
		}
	}

	const finishedAt = Date.now();
	const seconds = ((finishedAt - startedAt) / 1000).toFixed(1);
	setRun({
		status: 'done',
		activeNodeId: null,
		activeEdgeId: null,
		finishedAt
	});
	pushLog({
		nodeId: null,
		level: 'success',
		message: `Test run #${count} finished · ${visited.length} steps in ${seconds}s`
	});

	const lastNode = visited.at(-1);
	toast.success('Test run finished', {
		description: `${visited.length} steps in ${seconds}s${paths.length ? ` · took the ${paths.join(' → ')} path` : ''}`,
		action: lastNode
			? {
					label: 'View logs',
					onClick: () => openInspector(lastNode, 'logs')
				}
			: undefined
	});

	clearTimer = window.setTimeout(() => {
		if (run === token && flow.run.status === 'done') clearRun();
	}, 9000);
}
