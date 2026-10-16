import type { FlowNodeData } from '$lib/stores/flow-store.svelte';
import type { FlowGraph, FlowMeta, Problem } from './types.js';

export type Level = 'debug' | 'info' | 'success' | 'warning' | 'error';

export type LogEntry = {
	t: number;
	level: Level;
	runId: string;
	nodeId: string | null;
	message: string;
	data?: unknown;
};

export type StepStatus = 'pending' | 'running' | 'waiting' | 'done' | 'failed' | 'skipped';

/** One execution of one step. A step that runs twice (a loop, a retry that finally succeeds) has one `StepRun` per visit. */
export type StepRun = {
	nodeId: string;
	status: StepStatus;
	/** 1 for the first try; higher after a retry. */
	attempt: number;
	/** Which time this step has run in this run (loops). */
	visit: number;
	startedAt: number | null;
	endedAt: number | null;
	input?: unknown;
	output?: unknown;
	/** The output the step left by: `out`, or `true` / `false` for a branch. */
	port?: string;
	error?: string;
	/** True when a stand-in answered, not the host's adapter. */
	stubbed: boolean;
};

export type RunStatus = 'running' | 'paused' | 'done' | 'failed' | 'stopped';

/** What the runner needs to carry on a paused run after a reload. Plain data. */
export type RunState = {
	/** Values delivered along each connection and not yet used by the step they go into. */
	deliveries: Record<string, unknown[]>;
	visits: Record<string, number>;
	data: Record<string, unknown>;
	roots: string[];
	waiting: string[];
};

export type RunRecord = {
	id: string;
	flowId: string;
	flowName: string;
	/** A hash of the behaviour part of the graph at run time: steps, rules and connections, not positions or looks. */
	flowHash: string;
	status: RunStatus;
	trigger: unknown;
	startedAt: number;
	finishedAt: number | null;
	steps: StepRun[];
	logs: LogEntry[];
	/** Ids of the connections the run walked, in order. */
	traversed: string[];
	/** The outputs of the steps nothing came after, by step id. */
	output: Record<string, unknown>;
	/** True when any step was answered by a stand-in. */
	simulated: boolean;
	error?: string;
	state?: RunState;
};

export type RunEvent =
	| { type: 'run.started'; record: RunRecord }
	| { type: 'step.started'; nodeId: string; visit: number; attempt: number }
	| { type: 'step.finished'; step: StepRun }
	| { type: 'step.failed'; step: StepRun }
	| { type: 'step.waiting'; nodeId: string }
	| { type: 'step.skipped'; nodeId: string; reason: string }
	| { type: 'edge.taken'; edgeId: string }
	| { type: 'log'; entry: LogEntry }
	| { type: 'run.paused'; record: RunRecord }
	| { type: 'run.resumed'; record: RunRecord }
	| { type: 'run.finished'; record: RunRecord };

export type Clock = {
	now(): number;
	/** Waits `ms`. A fast clock does not wait: it moves its own time forward and returns at once. */
	sleep(ms: number, signal?: AbortSignal): Promise<void>;
	readonly fast: boolean;
};

/** What a step's executor is given. */
export type StepContext = {
	run: { id: string; startedAt: number };
	step: FlowNodeData;
	/** The upstream output; an object keyed by step id when several arrived. */
	input: unknown;
	/** Outputs of every step that has run, by step id, plus `trigger`. */
	data: Record<string, unknown>;
	trigger: unknown;
	/** The host's environment values. Never logged. */
	env: Record<string, string>;
	signal: AbortSignal;
	clock: Clock;
	adapters: Adapters;
	/** What the step's `rules.sampleOutput` says, parsed, or undefined. */
	sample: unknown;
	log: (level: Level, message: string, data?: unknown) => void;
};

export type StepResult = {
	output?: unknown;
	/** Defaults to `out`. A branch returns `true` or `false`. */
	port?: string;
	/** Set when a stand-in answered. */
	stubbed?: boolean;
	/** Set by a step that must wait for a person: the run pauses until `approve` or `reject`. */
	wait?: boolean;
};

export type Executor = (ctx: StepContext) => Promise<StepResult> | StepResult;

/**
 * What a host supplies to make steps real. Every one is optional: a step with no adapter is answered by a stand-in.
 * The library ships these interfaces and the stand-ins, and no provider code.
 */
export type Adapters = {
	/** Run Agent: one function per model name (`Jev (classifier)`), or `*` for any. */
	agents?: Record<string, (call: { model: string; prompt: string; input: unknown; step: FlowNodeData; signal: AbortSignal }) => Promise<unknown>>;
	/** Read Source and Write Output. */
	storage?: { read(path: string): Promise<unknown>; write(path: string, data: unknown): Promise<void> };
	/** Send Email. */
	mail?: { send(message: { subject: string; template?: string; body: unknown }): Promise<unknown> };
	/** Send Webhook. Only hosts in `allow` may be called; the default list is empty. */
	http?: {
		allow: string[];
		fetch?: (url: string, init: { method: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{ status: number; text(): Promise<string> }>;
	};
	/** Update Record. */
	records?: { update(change: { action: string; value: string; input: unknown }): Promise<unknown> };
	/** Run Workflow: another workflow by name or id. */
	flows?: { get(id: string): Promise<{ graph: FlowGraph; meta: FlowMeta } | undefined> };
	/** Review: Tests pass. */
	tests?: { run(call: { step: FlowNodeData; input: unknown }): Promise<{ pass: boolean; detail?: string }> };
};

export type RunStore = {
	list(flowId?: string): Promise<RunRecord[]>;
	get(id: string): Promise<RunRecord | undefined>;
	put(record: RunRecord): Promise<void>;
	delete(id: string): Promise<void>;
	/** Keeps the newest `keep` runs and drops the rest. */
	prune(keep: number): Promise<void>;
};

export type RunLimits = {
	/** Total step executions in one run. Default 200. */
	maxSteps: number;
	/** Times one step may run in one run. Default 10. */
	maxVisitsPerStep: number;
	/** A step that takes longer fails. Default 30 000 ms. */
	timeoutMs: number;
	/** The whole run, stopped when reached. Default 600 000 ms. */
	deadlineMs: number;
	/** Steps running at once. Default 4. */
	maxParallel: number;
	/** A log entry's `data` is cut to this many characters. Default 4 000. */
	logDataChars: number;
	/** Runs kept in the store. Default 50. */
	keepRuns: number;
};

export type RunnerOptions = {
	adapters?: Adapters;
	store?: RunStore;
	clock?: Clock;
	/** Host environment values, resolved into `${env.NAME}` references. Values are never logged. */
	env?: Record<string, string>;
	/** Extra strings to blank out of every log and output, besides the `env` values that look secret. */
	redact?: string[];
	limits?: Partial<RunLimits>;
	/** Extra or replacement executors by step kind. */
	executors?: Partial<Record<string, Executor>>;
};

export type RunOptions = {
	/** The payload the run starts with. Defaults to the trigger's sample output. */
	trigger?: unknown;
	/** Start at this step instead of at the trigger. */
	from?: string;
	flowId?: string;
	flowName?: string;
	signal?: AbortSignal;
	limits?: Partial<RunLimits>;
};

export type RunHandle = {
	id: string;
	/** Every event, from the first. Ends when the run does. */
	events: AsyncIterable<RunEvent>;
	subscribe(listener: (event: RunEvent) => void): () => void;
	/** Settles when the run is over, with its record. Never rejects: a failed run is a record with `status: 'failed'`. */
	result: Promise<RunRecord>;
	/** The record as it stands now. */
	snapshot(): RunRecord;
	stop(): void;
	/** Lets a step that is waiting for a person carry on. */
	approve(nodeId: string, note?: string): void;
	/** Fails a step that is waiting for a person. */
	reject(nodeId: string, reason?: string): void;
};

/** What `run` throws when the graph has errors: the run never starts. */
export class FlowRunError extends Error {
	problems: Problem[];

	constructor(problems: Problem[]) {
		super(problems[0]?.message ?? 'The workflow cannot run.');
		this.name = 'FlowRunError';
		this.problems = problems;
	}
}
