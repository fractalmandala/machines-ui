import { fastClock } from './clock.js';
import { EXECUTORS } from './executors.js';
import { clip, redact, secretsFrom } from './redact.js';
import { FlowRunError, type Adapters, type Clock, type Executor, type Level, type LogEntry, type RunEvent, type RunHandle, type RunLimits, type RunOptions, type RunRecord, type RunState, type RunnerOptions, type StepContext, type StepRun } from './run-types.js';
import { memoryRunStore } from './store.js';
import type { FlowGraph, FlowMeta } from './types.js';
import { validateGraph } from './validate.js';

export const DEFAULT_LIMITS: RunLimits = { maxSteps: 200, maxVisitsPerStep: 10, timeoutMs: 30_000, deadlineMs: 600_000, maxParallel: 4, logDataChars: 4_000, keepRuns: 50 };

/** A short hash of the part of a graph that changes what a run does: steps, rules, ports and connections. Not positions, not looks. */
export function behaviourHash(graph: FlowGraph): string {
	const text = JSON.stringify([
		graph.nodes.map((n) => [n.id, n.kind, n.title, n.input ?? null, n.outputs ?? null, Object.entries(n.rules ?? {}).sort()]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
		graph.edges.map((e) => [e.id, e.source, e.port, e.target]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
	]);
	let h = 0x811c9dc5;

	for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }

	return (h >>> 0).toString(16).padStart(8, '0');
}

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);
const parse = (v: string | undefined) => { if (v === undefined || v === '') return undefined; try { return JSON.parse(v); } catch { return v; } };

/**
 * Makes a runner. A runner holds the host's adapters, clock and run store, and starts runs.
 * With no adapters every step that touches the outside world is answered by a stand-in, and the default clock does
 * not wait: a run is a simulation. Give it adapters (and `realClock`) to make a run real.
 */
export function createRunner(options: RunnerOptions = {}) {
	const adapters: Adapters = options.adapters ?? {};
	const store = options.store ?? memoryRunStore();
	const clock: Clock = options.clock ?? fastClock();
	const env = options.env ?? {};
	const secrets = secretsFrom(env, options.redact);
	const executors: Record<string, Executor | undefined> = { ...EXECUTORS, ...options.executors };

	function begin(graph: FlowGraph, opts: RunOptions, resumeFrom?: RunRecord, meta?: FlowMeta): RunHandle {
		const limits: RunLimits = { ...DEFAULT_LIMITS, ...options.limits, ...opts.limits };
		const id = resumeFrom?.id ?? uid();
		const nodes = graph.nodes;
		const byId = new Map(nodes.map((n) => [n.id, n]));
		const order = new Map(nodes.map((n, i) => [n.id, i]));
		const incoming = new Map(nodes.map((n) => [n.id, graph.edges.filter((e) => e.target === n.id && byId.has(e.source))]));
		const outgoing = new Map(nodes.map((n) => [n.id, graph.edges.filter((e) => e.source === n.id && byId.has(e.target))]));
		const controller = new AbortController();
		const external = opts.signal;

		if (external) external.aborted ? controller.abort(external.reason) : external.addEventListener('abort', () => controller.abort(external.reason), { once: true });

		const trigger = resumeFrom ? resumeFrom.trigger : opts.trigger !== undefined ? opts.trigger : parse(nodes.find((n) => n.kind === 'trigger')?.rules?.sampleOutput);
		const startedAt = resumeFrom?.startedAt ?? clock.now();

		const record: RunRecord = resumeFrom ?? {
			id,
			flowId: opts.flowId ?? meta?.id ?? 'flow',
			flowName: opts.flowName ?? meta?.name ?? 'Workflow',
			flowHash: behaviourHash(graph),
			status: 'running',
			trigger: redact(trigger, secrets),
			startedAt,
			finishedAt: null,
			steps: [],
			logs: [],
			traversed: [],
			output: {},
			simulated: false
		};

		const queues = new Map<string, unknown[]>(graph.edges.map((e) => [e.id, [...(resumeFrom?.state?.deliveries[e.id] ?? [])]]));
		const visits: Record<string, number> = { ...(resumeFrom?.state?.visits ?? {}) };
		const data: Record<string, unknown> = { ...(resumeFrom?.state?.data ?? {}), trigger };
		const roots = new Set<string>(resumeFrom?.state?.roots ?? (opts.from ? [opts.from] : nodes.filter((n) => n.kind === 'trigger').map((n) => n.id)));
		const running = new Map<string, Promise<void>>();
		const approvals = new Map<string, { resolve: (v: { note?: string }) => void; reject: (e: Error) => void }>();
		const current = new Map<string, StepRun>();
		const events: RunEvent[] = [];
		const listeners = new Set<(e: RunEvent) => void>();
		let wake = null as (() => void) | null;
		let finished = false;
		let totalSteps = record.steps.length;
		let failure: string | null = null;
		let stopped = false;
		let persisting: Promise<void> = Promise.resolve();

		const emit = (event: RunEvent) => {
			events.push(event);
			for (const l of listeners) l(event);
			wake?.();
		};

		const log = (level: Level, message: string, nodeId: string | null = null, extra?: unknown) => {
			const entry: LogEntry = { t: clock.now(), level, runId: id, nodeId, message: redact(message, secrets) };

			if (extra !== undefined) entry.data = clip(redact(extra, secrets), limits.logDataChars);

			record.logs.push(entry);
			emit({ type: 'log', entry });
		};

		const state = (): RunState => ({
			deliveries: Object.fromEntries([...queues].filter(([, q]) => q.length).map(([k, q]) => [k, JSON.parse(JSON.stringify(q))])),
			visits: { ...visits },
			data: JSON.parse(JSON.stringify(data, (k, v) => (v === undefined ? null : v))),
			roots: [...roots],
			waiting: [...approvals.keys()]
		});

		const persist = () => {
			record.state = state();
			persisting = persisting.then(() => store.put(record)).catch(() => {});
		};

		const label = (nodeId: string) => byId.get(nodeId)?.title || nodeId;

		// ── which steps may start ──────────────────────────────────────────────────

		const queue = (edgeId: string) => queues.get(edgeId)!;
		const candidates = () => nodes.filter((n) => !running.has(n.id) && (roots.has(n.id) || incoming.get(n.id)!.some((e) => queue(e.id).length > 0))).map((n) => n.id);

		function reach(starts: string[], skip: string) {
			const seen = new Set<string>();
			const todo = [...starts];

			while (todo.length) {
				const at = todo.pop()!;

				if (seen.has(at) || at === skip) continue;

				seen.add(at);
				for (const e of outgoing.get(at) ?? []) todo.push(e.target);
			}

			return seen;
		}

		function ready(): string[] {
			const cands = candidates();
			const out: string[] = [];

			for (const v of cands) {
				const active = [...running.keys(), ...cands].filter((x) => x !== v);
				const maybe = reach(active, v);

				// a step waits while any step that could still send it something has not finished
				if (incoming.get(v)!.every((e) => queue(e.id).length > 0 || !maybe.has(e.source))) out.push(v);
			}

			return out.sort((a, b) => order.get(a)! - order.get(b)!);
		}

		// ── running one step ───────────────────────────────────────────────────────

		const context = (node: (typeof nodes)[number], input: unknown): StepContext => {
			const ctx: StepContext & { __child?: unknown } = {
				run: { id, startedAt },
				step: node,
				input,
				data,
				trigger,
				env,
				signal: controller.signal,
				clock,
				adapters,
				sample: parse(node.rules?.sampleOutput),
				log: (level, message, extra) => log(level, message, node.id, extra)
			};

			ctx.__child = async (found: { graph: FlowGraph; meta: FlowMeta }, childInput: unknown) => {
				const child = begin(found.graph, { trigger: childInput, flowId: found.meta.id, flowName: found.meta.name, signal: controller.signal }, undefined, found.meta);
				const result = await child.result;

				if (result.status !== 'done') throw new Error(`“${found.meta.name}” ${result.status}${result.error ? `: ${result.error}` : ''}.`);

				const outs = Object.values(result.output);

				return outs.length === 1 ? outs[0] : result.output;
			};

			return ctx;
		};

		const withTimeout = <T,>(work: Promise<T>, ms: number, nodeId: string) =>
			new Promise<T>((resolve, reject) => {
				const timer = setTimeout(() => reject(new Error(`“${label(nodeId)}” took longer than ${ms} ms.`)), ms);
				const onAbort = () => reject(controller.signal.reason instanceof Error ? controller.signal.reason : new Error('Stopped.'));

				controller.signal.addEventListener('abort', onAbort, { once: true });
				work.then((v) => { clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort); resolve(v); }, (e) => { clearTimeout(timer); controller.signal.removeEventListener('abort', onAbort); reject(e); });
			});

		function settleOk(node: (typeof nodes)[number], step: StepRun, output: unknown, port: string, stubbed: boolean) {
			step.status = 'done';
			step.output = redact(output, secrets);
			step.port = port;
			step.stubbed = stubbed;
			step.endedAt = clock.now();
			if (stubbed) record.simulated = true;
			data[node.id] = output;
			log('success', `${node.title || node.id} finished${stubbed ? ' (stand-in)' : ''}`, node.id);
			emit({ type: 'step.finished', step: { ...step } });

			const onPort = (outgoing.get(node.id) ?? []).filter((e) => e.port === port);

			if (!onPort.length) {
				record.output[node.id] = redact(output, secrets);

				if (node.kind === 'branch') log('warning', `The ${port.toUpperCase()} path has no next step: the run ends here.`, node.id);
			}

			for (const e of onPort) {
				queue(e.id).push(output);
				record.traversed.push(e.id);
				emit({ type: 'edge.taken', edgeId: e.id });
			}
		}

		function settleFail(node: (typeof nodes)[number], step: StepRun, error: Error, stubbed: boolean) {
			step.status = 'failed';
			step.error = redact(error.message, secrets);
			step.stubbed = stubbed;
			step.endedAt = clock.now();
			log('error', `${node.title || node.id} failed: ${error.message}`, node.id);
			emit({ type: 'step.failed', step: { ...step } });

			if ((node.rules?.onError ?? 'stop') === 'continue') {
				const output = { error: error.message };
				const port = node.kind === 'branch' ? 'false' : 'out';

				data[node.id] = output;
				log('warning', `Continuing past the failure (${node.title || node.id}).`, node.id);

				for (const e of (outgoing.get(node.id) ?? []).filter((x) => x.port === port)) { queue(e.id).push(output); record.traversed.push(e.id); emit({ type: 'edge.taken', edgeId: e.id }); }

				if (!(outgoing.get(node.id) ?? []).some((e) => e.port === port)) record.output[node.id] = output;
			} else if (!failure) {
				failure = error.message;
				controller.abort(new Error('A step failed.'));
			}
		}

		function launch(nodeId: string) {
			const node = byId.get(nodeId)!;
			const got: [string, unknown][] = [];

			for (const e of incoming.get(nodeId)!) if (queue(e.id).length) got.push([e.source, queue(e.id).shift()]);

			const isRoot = roots.delete(nodeId);
			const input = got.length === 0 ? (isRoot ? trigger : undefined) : got.length === 1 ? got[0][1] : Object.fromEntries(got);

			visits[nodeId] = (visits[nodeId] ?? 0) + 1;

			if (visits[nodeId] > limits.maxVisitsPerStep) {
				log('warning', `“${label(nodeId)}” has run ${limits.maxVisitsPerStep} times: it is skipped from now on.`, nodeId);
				emit({ type: 'step.skipped', nodeId, reason: 'visit limit' });

				return;
			}

			totalSteps++;

			const step: StepRun = { nodeId, status: 'running', attempt: 1, visit: visits[nodeId], startedAt: clock.now(), endedAt: null, input: redact(input, secrets), stubbed: false };

			record.steps.push(step);
			current.set(nodeId, step);
			log('info', `${node.title || nodeId} started`, nodeId);
			emit({ type: 'step.started', nodeId, visit: step.visit, attempt: 1 });

			const attempts = node.rules?.onError === 'retry' ? Math.max(1, Number(node.rules?.attempts ?? 3) || 3) : 1;
			const timeout = Number(node.rules?.timeoutMs) || limits.timeoutMs;

			const work = (async () => {
				const executor = executors[node.kind];

				if (!executor) throw new Error(`There is no executor for “${node.kind}”.`);

				let lastError: Error = new Error('Failed.');

				for (let attempt = 1; attempt <= attempts; attempt++) {
					step.attempt = attempt;

					if (attempt > 1) emit({ type: 'step.started', nodeId, visit: step.visit, attempt });

					try {
						return await withTimeout(Promise.resolve(executor(context(node, input))), timeout, nodeId);
					} catch (e) {
						lastError = e instanceof Error ? e : new Error(String(e));

						if (controller.signal.aborted || attempt === attempts) throw lastError;

						log('warning', `Attempt ${attempt} of ${attempts} failed (${lastError.message}). Trying again.`, nodeId);
						await clock.sleep(Number(node.rules?.backoffMs ?? 200) * 2 ** (attempt - 1), controller.signal);
					}
				}

				throw lastError;
			})();

			const done = work
				.then(async (result) => {
					if (result.wait) {
						step.status = 'waiting';
						emit({ type: 'step.waiting', nodeId });
						log('info', `${node.title || nodeId} is waiting for a person.`, nodeId);

						const verdict = await new Promise<{ note?: string }>((resolve, reject) => {
							approvals.set(nodeId, { resolve, reject });
							controller.signal.addEventListener('abort', () => reject(new Error('Stopped.')), { once: true });
							setPaused();
						});

						approvals.delete(nodeId);
						settleOk(node, step, { approved: true, ...(verdict.note ? { note: verdict.note } : {}) }, 'out', false);
					} else settleOk(node, step, result.output, result.port ?? 'out', Boolean(result.stubbed));
				})
				// a failure in the executor, a rejection by a person, or a stop: all end up here
				.catch((error: unknown) => {
					approvals.delete(nodeId);

					if (stopped) { step.status = 'failed'; step.error = 'Stopped.'; step.endedAt = clock.now(); return; }

					settleFail(node, step, error instanceof Error ? error : new Error(String(error)), step.stubbed);
				})
				.then(() => {
					running.delete(nodeId);
					current.delete(nodeId);
					persist();
				});

			running.set(nodeId, done);
		}

		// a restored run: steps that were waiting for a person wait again
		function relaunchWaiting(nodeId: string) {
			const node = byId.get(nodeId);
			const step = [...record.steps].reverse().find((s) => s.nodeId === nodeId && s.status === 'waiting');

			if (!node || !step) return;

			current.set(nodeId, step);

			running.set(
				nodeId,
				new Promise<{ note?: string }>((resolve, reject) => {
					approvals.set(nodeId, { resolve, reject });
					controller.signal.addEventListener('abort', () => reject(new Error('Stopped.')), { once: true });
				})
					.then((verdict) => { approvals.delete(nodeId); settleOk(node, step, { approved: true, ...(verdict.note ? { note: verdict.note } : {}) }, 'out', false); })
					.catch((error: unknown) => { approvals.delete(nodeId); if (stopped) { step.status = 'failed'; step.error = 'Stopped.'; return; } settleFail(node, step, error instanceof Error ? error : new Error(String(error)), false); })
					.then(() => { running.delete(nodeId); current.delete(nodeId); persist(); })
			);
		}

		function setPaused() {
			const waiting = approvals.size;

			if (waiting && waiting === running.size && record.status === 'running') {
				record.status = 'paused';
				persist();
				emit({ type: 'run.paused', record: structuredClone(record) });
			}
		}

		const resumed = () => {
			if (record.status === 'paused') { record.status = 'running'; emit({ type: 'run.resumed', record: structuredClone(record) }); }
		};

		// ── the loop ───────────────────────────────────────────────────────────────

		const deadline = setTimeout(() => { if (!failure && !stopped) { failure = `The run passed its ${limits.deadlineMs} ms deadline.`; controller.abort(new Error(failure)); } }, limits.deadlineMs);

		const result: Promise<RunRecord> = (async () => {
			if (resumeFrom) {
				record.status = 'running';
				for (const nodeId of resumeFrom.state?.waiting ?? []) relaunchWaiting(nodeId);
			}

			emit({ type: resumeFrom ? 'run.resumed' : 'run.started', record: structuredClone(record) });
			log('info', resumeFrom ? `Run resumed (${record.flowName})` : `Run started (${record.flowName})`);

			setPaused();

			while (!controller.signal.aborted) {
				const waitingNow = approvals.size;

				for (const nodeId of ready()) {
					if (running.size - waitingNow >= limits.maxParallel) break;

					if (totalSteps >= limits.maxSteps) { failure = `Stopped at the limit of ${limits.maxSteps} steps.`; controller.abort(new Error(failure)); break; }

					launch(nodeId);
				}

				if (controller.signal.aborted || running.size === 0) break;

				await Promise.race(running.values());
			}

			// let everything that is still going settle
			await Promise.allSettled([...running.values()]);
			clearTimeout(deadline);
			stopped = stopped || (controller.signal.aborted && !failure);
			record.status = failure ? 'failed' : stopped ? 'stopped' : 'done';
			if (failure) record.error = redact(failure, secrets);
			record.finishedAt = clock.now();
			record.state = undefined;

			const seconds = ((record.finishedAt - record.startedAt) / 1000).toFixed(1);
			const count = record.steps.filter((s) => s.status === 'done').length;

			log(failure ? 'error' : stopped ? 'warning' : 'success', failure ? `Run failed: ${failure}` : stopped ? 'Run stopped.' : `Run finished · ${count} steps in ${seconds}s${record.simulated ? ' (simulated)' : ''}`);
			finished = true;
			emit({ type: 'run.finished', record: structuredClone(record) });

			persisting = persisting.then(() => store.put(record)).then(() => store.prune(limits.keepRuns)).catch(() => {});
			await persisting;
			wake?.();

			return record;
		})();

		// ── the handle ─────────────────────────────────────────────────────────────

		const iterable: AsyncIterable<RunEvent> = {
			[Symbol.asyncIterator]() {
				let at = 0;

				return {
					async next() {
						for (;;) {
							if (at < events.length) return { value: events[at++], done: false };
							if (finished) return { value: undefined, done: true };

							await new Promise<void>((r) => { wake = r; });
						}
					}
				};
			}
		};

		return {
			id,
			events: iterable,
			subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
			result,
			snapshot: () => structuredClone(record),
			stop() { if (!finished) { stopped = true; controller.abort(new Error('Stopped.')); } },
			approve(nodeId, note) { const a = approvals.get(nodeId); if (a) { resumed(); a.resolve({ note }); } },
			reject(nodeId, reason) { const a = approvals.get(nodeId); if (a) { resumed(); a.reject(new Error(reason ? `Rejected: ${reason}` : 'Rejected.')); } }
		};
	}

	return {
		/**
		 * Starts a run. Throws `FlowRunError` (before anything runs) if the graph has errors. Returns at once with a handle;
		 * `handle.result` settles when the run is over.
		 */
		run(graph: FlowGraph, opts: RunOptions = {}, meta?: FlowMeta): RunHandle {
			const errors = validateGraph(graph).filter((p) => p.severity === 'error');

			if (errors.length) throw new FlowRunError(errors);

			return begin(graph, opts, undefined, meta);
		},
		/** Carries on a run that was paused (waiting for a person) when it was saved: after a reload, or in another process. */
		resume(graph: FlowGraph, record: RunRecord, opts: RunOptions = {}): RunHandle {
			if (record.status !== 'paused' || !record.state) throw new Error('Only a paused run can be resumed.');

			return begin(graph, opts, structuredClone(record));
		},
		store
	};
}

export type Runner = ReturnType<typeof createRunner>;
