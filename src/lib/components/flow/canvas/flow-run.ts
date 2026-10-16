// The run, as the canvas uses it. The work is done by the headless engine (`$lib/engine`): this file starts a run for
// the open workflow, and turns the engine's events into the store the canvas, panels and run bar read.
import { toast } from 'svelte-sonner';
import { FlowRunError, createRunner, memoryRunStore, type RunEvent, type RunHandle, type RunRecord, type RunStore, type RunnerOptions } from '$lib/engine/index.js';
import { clearRun, flow, openInspector, setRun, type RunSummary, type StepProgress } from '$lib/stores/flow-store.svelte';

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

let store: RunStore = memoryRunStore();
let runner = createRunner({ store });
let handle: RunHandle | null = null;
let unsubscribe: (() => void) | null = null;
let edgeTimer: number | null = null;
let syncing = false;

/**
 * Sets what runs are made of. With no call, every step that would touch the outside world is answered by a
 * stand-in and delays are skipped: a run is a simulation. Pass `adapters` (and a real `clock`) to make steps real,
 * a `store` such as `indexedDbRunStore()` to keep runs across reloads, and `env` for `${env.NAME}` values.
 */
export function configureRunner(options: RunnerOptions = {}) {
	store = options.store ?? memoryRunStore();
	runner = createRunner({ ...options, store });
}

/** The store the runner keeps its runs in. */
export const runStore = () => store;

const name = (id: string) => id.replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());

function scheduleSync() {
	if (syncing || !handle) return;

	syncing = true;
	queueMicrotask(() => {
		syncing = false;
		if (handle) flow.record = handle.snapshot();
	});
}

async function refreshHistory() {
	const runs = await store.list(flow.graphId);

	flow.history = runs.map((r, i): RunSummary => ({ id: r.id, status: r.status, startedAt: r.startedAt, finishedAt: r.finishedAt, simulated: r.simulated, steps: r.steps.length, number: runs.length - i }));
}

function reduce(event: RunEvent) {
	const progress = (nodeId: string, status: StepProgress) => setRun({ stepStatus: { ...flow.run.stepStatus, [nodeId]: status } });

	switch (event.type) {
		case 'run.started':
			setRun({ status: 'running', runId: event.record.id, startedAt: event.record.startedAt, finishedAt: null, visited: [], traversed: [], stepStatus: {}, waiting: [], simulated: false, error: null, activeNodeId: null, activeEdgeId: null, count: flow.run.count + 1 });
			flow.viewedRun = null;
			flow.viewedRecord = null;
			break;
		case 'step.started':
			progress(event.nodeId, 'running');
			setRun({ activeNodeId: event.nodeId });
			break;
		case 'step.finished':
			progress(event.step.nodeId, 'done');
			setRun({ visited: [...new Set([...flow.run.visited, event.step.nodeId])], activeNodeId: null, simulated: flow.run.simulated || event.step.stubbed });
			break;
		case 'step.failed':
			progress(event.step.nodeId, 'failed');
			setRun({ activeNodeId: null });
			break;
		case 'step.waiting':
			progress(event.nodeId, 'waiting');
			setRun({ waiting: [...new Set([...flow.run.waiting, event.nodeId])], activeNodeId: null });
			break;
		case 'edge.taken':
			setRun({ traversed: [...flow.run.traversed, event.edgeId], activeEdgeId: event.edgeId });
			if (edgeTimer) window.clearTimeout(edgeTimer);
			edgeTimer = window.setTimeout(() => setRun({ activeEdgeId: null }), 700);
			break;
		case 'run.paused':
			setRun({ status: 'paused' });
			break;
		case 'run.resumed':
			setRun({ status: 'running', waiting: flow.run.waiting.filter((id) => flow.run.stepStatus[id] === 'waiting') });
			break;
		case 'run.finished': {
			const r = event.record;

			setRun({ status: r.status === 'done' ? 'done' : r.status === 'stopped' ? 'stopped' : 'failed', finishedAt: r.finishedAt, activeNodeId: null, activeEdgeId: null, waiting: [], simulated: r.simulated, error: r.error ?? null });
			flow.record = r;
			void refreshHistory();
			finished(r);
			break;
		}
	}

	scheduleSync();
}

function finished(r: RunRecord) {
	const done = r.steps.filter((s) => s.status === 'done').length;
	const seconds = ((r.finishedAt ?? r.startedAt) - r.startedAt) / 1000;
	const lastNode = r.steps.filter((s) => s.status === 'done').at(-1)?.nodeId;
	const action = lastNode ? { label: 'View logs', onClick: () => openInspector(lastNode, 'logs') } : undefined;

	if (r.status === 'done') toast.success(r.simulated ? 'Simulated run finished' : 'Run finished', { description: `${done} steps${seconds >= 0.1 ? ` in ${seconds.toFixed(1)}s` : ''}`, action });
	else if (r.status === 'failed') toast.error('Run failed', { description: r.error, action });
}

export function stopRun() {
	handle?.stop();
}

/** True while a run is going or waiting for a person. */
export const isRunning = () => flow.run.status === 'running' || flow.run.status === 'paused';

/**
 * Runs the open workflow. `trigger` is the payload it starts with; without it the run uses the payload typed in the
 * run bar, then the trigger step's sample output. Returns the handle, or null if the workflow cannot run.
 */
export function startRun(options: { trigger?: unknown; name?: string; from?: string } = {}): RunHandle | null {
	if (isRunning()) return handle;

	let trigger = options.trigger;

	if (trigger === undefined && flow.payload.trim()) {
		try {
			trigger = JSON.parse(flow.payload);
		} catch {
			toast.error('The payload is not valid JSON', { description: 'Fix it in the run bar, or clear it to use the trigger’s sample.' });

			return null;
		}
	}

	unsubscribe?.();

	try {
		handle = runner.run({ nodes: plain(flow.nodes), edges: plain(flow.edges) }, { trigger, from: options.from, flowId: flow.graphId, flowName: options.name ?? name(flow.graphId) });
	} catch (error) {
		if (!(error instanceof FlowRunError)) throw error;

		toast.error('This workflow cannot run yet', { description: error.problems.slice(0, 3).map((p) => p.message).join(' ') });

		return null;
	}

	unsubscribe = handle.subscribe(reduce);

	// the runner announces the start before anyone can listen: begin from a clean canvas
	if (flow.run.runId !== handle.id) reduce({ type: 'run.started', record: handle.snapshot() });

	return handle;
}

/** Lets a step that is waiting for a person carry on. */
export function approveStep(nodeId: string, note?: string) {
	handle?.approve(nodeId, note);
}

/** Fails a step that is waiting for a person. */
export function rejectStep(nodeId: string, reason?: string) {
	handle?.reject(nodeId, reason);
}

/** Shows an earlier run in the Logs tab (null goes back to the latest). */
export async function viewRun(id: string | null) {
	flow.viewedRun = id;
	flow.viewedRecord = id && id !== flow.record?.id ? ((await store.get(id)) ?? null) : null;
}

/** Carries on a run that was saved while paused, for example after a reload, when the runner was given a persistent store. */
export async function resumeRun(id: string): Promise<RunHandle | null> {
	const record = await store.get(id);

	if (!record || record.status !== 'paused') return null;

	unsubscribe?.();
	handle = runner.resume({ nodes: plain(flow.nodes), edges: plain(flow.edges) }, record);
	setRun({ status: 'running', runId: record.id, startedAt: record.startedAt, stepStatus: Object.fromEntries(record.steps.filter((s) => s.status === 'done' || s.status === 'waiting').map((s) => [s.nodeId, s.status as StepProgress])), visited: record.steps.filter((s) => s.status === 'done').map((s) => s.nodeId), traversed: record.traversed, waiting: record.state?.waiting ?? [], simulated: record.simulated, error: null });
	flow.record = record;
	unsubscribe = handle.subscribe(reduce);

	return handle;
}

/** Forgets the run on the canvas (the statuses on the steps); the history stays. */
export function resetRun() {
	handle?.stop();
	clearRun();
}
