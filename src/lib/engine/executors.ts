import { evaluate, describe, lookup, parseConditions } from './conditions.js';
import { resolveRefs } from './redact.js';
import { checkSchema } from './schema.js';
import { convert } from './transform.js';
import type { Executor, StepContext, StepResult } from './run-types.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const UNITS: Record<string, number> = { minutes: 60_000, hours: 3_600_000, days: 86_400_000, weeks: 604_800_000 };

const rule = (ctx: StepContext, key: string, fallback = '') => resolveRefs(ctx.step.rules?.[key] ?? fallback, ctx.env);
const asText = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v));

/** The step's own `rules.sampleOutput` if it has one, else the plain default for its kind. */
const sampleOr = (ctx: StepContext, fallback: unknown) => (ctx.sample !== undefined ? ctx.sample : fallback);

const human = (ms: number) => {
	const s = Math.round(ms / 1000);

	if (s < 90) return `${s}s`;
	if (s < 5400) return `${Math.round(s / 60)} min`;
	if (s < 129_600) return `${(s / 3600).toFixed(1).replace(/\.0$/, '')} h`;

	return `${(s / 86_400).toFixed(1).replace(/\.0$/, '')} days`;
};

// ── the steps that run for real, with no adapter ──────────────────────────────────

const trigger: Executor = (ctx) => ({ output: ctx.trigger !== undefined ? ctx.trigger : (ctx.sample ?? {}) });

const branch: Executor = (ctx) => {
	const set = parseConditions(ctx.step.rules?.conditions);

	if (!set.items.length) {
		ctx.log('warning', 'No condition is set, so this branch takes TRUE.');

		return { output: ctx.input, port: 'true' };
	}

	const missing = set.items.filter((c) => c.operator !== 'exists' && lookup(ctx.data, c.path) === undefined).map((c) => c.path);

	if (missing.length) ctx.log('warning', `Nothing found at ${missing.join(', ')}; a missing value fails the condition.`);

	const result = evaluate(set, ctx.data);

	ctx.log('info', `${describe(set)} → ${result ? 'TRUE' : 'FALSE'}`);

	return { output: ctx.input, port: result ? 'true' : 'false' };
};

const transform: Executor = (ctx) => {
	const from = ctx.step.rules?.from ?? 'JSON';
	const to = ctx.step.rules?.to ?? 'Markdown';
	const output = convert(ctx.input, from, to);

	ctx.log('info', `Converted ${from} to ${to}`);

	return { output };
};

const timeDelay: Executor = async (ctx) => {
	const amount = Number(ctx.step.rules?.amount ?? 2) || 1;
	const unit = ctx.step.rules?.unit ?? 'days';
	const ms = amount * (UNITS[unit] ?? UNITS.days);

	ctx.log('info', ctx.clock.fast ? `Would wait ${amount} ${unit} (${human(ms)}), skipped in a simulation` : `Waiting ${amount} ${unit}`);
	await ctx.clock.sleep(ms, ctx.signal);

	return { output: ctx.input };
};

const waitUntil: Executor = async (ctx) => {
	const day = ctx.step.rules?.day ?? 'Monday';
	const [h = 9, m = 0] = (ctx.step.rules?.time ?? '09:00').split(':').map(Number);
	const now = new Date(ctx.clock.now());
	const target = new Date(now);

	target.setHours(h, m, 0, 0);

	const want = DAYS.indexOf(day);

	if (want >= 0) target.setDate(target.getDate() + ((want - now.getDay() + 7) % 7));
	if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + (want >= 0 ? 7 : 1));

	const ms = target.getTime() - now.getTime();

	ctx.log('info', ctx.clock.fast ? `Would wait until ${day} at ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} (${human(ms)}), skipped in a simulation` : `Waiting until ${day} at ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
	await ctx.clock.sleep(ms, ctx.signal);

	return { output: ctx.input };
};

const review: Executor = async (ctx) => {
	const check = ctx.step.rules?.check ?? 'Schema valid';

	if (check === 'Human approves') {
		ctx.log('info', 'Waiting for a person to approve.');

		return { wait: true };
	}

	if (check === 'Schema valid') {
		const raw = ctx.step.rules?.schema;

		if (!raw) { ctx.log('warning', 'No schema is set, so there is nothing to check against.'); return { output: ctx.input }; }

		let schema;

		try { schema = JSON.parse(raw); } catch { throw new Error('The schema is not valid JSON.'); }

		let value = ctx.input;

		if (typeof value === 'string') { try { value = JSON.parse(value); } catch { /* checked as text */ } }

		const problems = checkSchema(value, schema);

		if (problems.length) throw new Error(`Schema valid failed: ${problems.slice(0, 3).join('; ')}`);

		ctx.log('success', 'Schema valid: the output fits.');

		return { output: ctx.input };
	}

	if (check === 'Score above threshold') {
		const path = ctx.step.rules?.path;
		const found = path ? lookup(ctx.data, path) : ctx.input;
		const score = Number(found);
		const threshold = Number(ctx.step.rules?.threshold ?? 0.5);

		if (found === undefined || Number.isNaN(score)) throw new Error(`Score above threshold failed: no number at ${path ?? 'the input'}.`);
		if (!(score > threshold)) throw new Error(`Score above threshold failed: ${score} is not above ${threshold}.`);

		ctx.log('success', `Score above threshold: ${score} > ${threshold}`);

		return { output: ctx.input };
	}

	if (check === 'Tests pass') {
		if (ctx.adapters.tests) {
			const result = await ctx.adapters.tests.run({ step: ctx.step, input: ctx.input });

			if (!result.pass) throw new Error(`Tests pass failed${result.detail ? `: ${result.detail}` : '.'}`);

			ctx.log('success', `Tests pass${result.detail ? `: ${result.detail}` : ''}`);

			return { output: ctx.input };
		}

		const pass = (ctx.sample as { pass?: boolean } | undefined)?.pass ?? true;

		ctx.log('info', `Stand-in: would run the tests. They ${pass ? 'pass' : 'fail'}.`);

		if (!pass) throw new Error('Tests pass failed (stand-in).');

		return { output: ctx.input, stubbed: true };
	}

	throw new Error(`Unknown check "${check}".`);
};

// ── the steps that touch the outside world: an adapter if there is one, else a stand-in ──

const agent: Executor = async (ctx) => {
	const model = ctx.step.rules?.model ?? 'Luna (worker)';
	const prompt = rule(ctx, 'prompt', ctx.step.description);
	const call = ctx.adapters.agents?.[model] ?? ctx.adapters.agents?.['*'];

	if (call) {
		ctx.log('info', `Asking ${model}`);

		return { output: await call({ model, prompt, input: ctx.input, step: ctx.step, signal: ctx.signal }) };
	}

	ctx.log('info', `Stand-in: ${model} would be asked “${prompt}”.`);

	return { output: sampleOr(ctx, `[stand-in answer from ${model}]`), stubbed: true };
};

const read: Executor = async (ctx) => {
	const path = rule(ctx, 'source', 'the source');

	if (ctx.adapters.storage) {
		ctx.log('info', `Reading ${path}`);

		return { output: await ctx.adapters.storage.read(path) };
	}

	ctx.log('info', `Stand-in: would read ${path}.`);

	return { output: sampleOr(ctx, { path, content: `[stand-in content of ${path}]` }), stubbed: true };
};

const write: Executor = async (ctx) => {
	const path = rule(ctx, 'target', 'the output');

	if (ctx.adapters.storage) {
		await ctx.adapters.storage.write(path, ctx.input);
		ctx.log('success', `Wrote ${path}`);

		return { output: { path, written: true } };
	}

	ctx.log('info', `Stand-in: would write ${path}.`);

	return { output: sampleOr(ctx, { path, written: false }), stubbed: true };
};

const email: Executor = async (ctx) => {
	const subject = rule(ctx, 'subject', ctx.step.title);

	if (ctx.adapters.mail) {
		const sent = await ctx.adapters.mail.send({ subject, template: ctx.step.rules?.template, body: ctx.input });

		ctx.log('success', `Sent “${subject}”`);

		return { output: sent ?? { sent: true, subject } };
	}

	ctx.log('info', `Stand-in: would send “${subject}”.`);

	return { output: sampleOr(ctx, { sent: false, subject }), stubbed: true };
};

const webhook: Executor = async (ctx) => {
	const method = ctx.step.rules?.method ?? 'POST';
	const url = rule(ctx, 'url');

	if (ctx.adapters.http && url) {
		let host = '';

		try { host = new URL(url).host; } catch { throw new Error(`“${url}” is not a URL.`); }

		if (!ctx.adapters.http.allow.includes(host)) {
			ctx.log('error', `Blocked: ${host} is not on the list of hosts this workflow may call.`);

			throw new Error(`Host ${host} is not allowed.`);
		}

		if (ctx.adapters.http.fetch) {
			const response = await ctx.adapters.http.fetch(url, { method, headers: { 'content-type': 'application/json' }, body: asText(ctx.input), signal: ctx.signal });

			if (response.status >= 400) throw new Error(`${method} ${host} answered ${response.status}.`);

			ctx.log('success', `${method} ${host} answered ${response.status}`);

			return { output: { status: response.status, body: await response.text() } };
		}
	}

	ctx.log('info', `Stand-in: would ${method} ${url || 'the webhook URL'}.`);

	return { output: sampleOr(ctx, { status: 200, standIn: true }), stubbed: true };
};

const record: Executor = async (ctx) => {
	const action = ctx.step.rules?.action ?? 'Add tag';
	const value = rule(ctx, 'value');

	if (ctx.adapters.records) {
		const updated = await ctx.adapters.records.update({ action, value, input: ctx.input });

		ctx.log('success', `${action}: ${value}`);

		return { output: updated ?? { updated: true } };
	}

	ctx.log('info', `Stand-in: would ${action.toLowerCase()} “${value}”.`);

	return { output: sampleOr(ctx, { updated: false }), stubbed: true };
};

/** Starts another workflow and waits for it. The runner provides `__child` so this stays free of the runner itself. */
const workflow: Executor = async (ctx) => {
	const name = rule(ctx, 'automation', ctx.step.title);
	const found = await ctx.adapters.flows?.get(name);

	if (found) {
		const child = (ctx as StepContext & { __child?: (g: unknown, input: unknown) => Promise<unknown> }).__child;

		if (child) {
			ctx.log('info', `Starting “${name}”`);

			return { output: await child(found, ctx.input) };
		}
	}

	ctx.log('info', `Stand-in: would start “${name}”.`);

	return { output: sampleOr(ctx, { started: false, workflow: name }), stubbed: true };
};

export const EXECUTORS: Record<string, Executor> = {
	trigger,
	branch,
	transform,
	'time-delay': timeDelay,
	'wait-until': waitUntil,
	review,
	agent,
	read,
	write,
	'send-email': email,
	'send-webhook': webhook,
	'update-record': record,
	'run-workflow': workflow
};

export type { StepResult };
