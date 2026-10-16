#!/usr/bin/env node
// Headless tests for the run engine (dist/engine), in plain Node. Needs `pnpm prepack` first: it reads dist.
//   node scripts/engine-run-check.ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type * as Engine from '../src/lib/engine/index.ts';
import type * as EngineNode from '../src/lib/engine/node.ts';
import type * as Automations from '../src/lib/data/automations.ts';
import type { FlowGraph, RunOptions, RunRecord, Runner } from '../src/lib/engine/index.ts';

// the checks run against the build in dist, typed by the sources it is built from
// (so type-checking does not need a build)
const fromDist = async <T>(path: string): Promise<T> => import(new URL(`../dist/${path}`, import.meta.url).href);
const { FlowRunError, createRunner, fastClock, memoryRunStore, realClock, behaviourHash, check, evaluate, lookup, parseConditions, convert, checkSchema, redact, clip, resolveRefs, secretsFrom } = await fromDist<typeof Engine>('engine/index.js');
const { fileRunStore } = await fromDist<typeof EngineNode>('engine/node.js');
const { SEED_GRAPHS, seedAutomations } = await fromDist<typeof Automations>('data/automations.js');

type Node = FlowGraph['nodes'][number];

let checks = 0;
const problems: string[] = [];
const ok = (cond: unknown, msg: string) => { checks++; if (!cond) problems.push(msg); };
const eq = (a: unknown, b: unknown, msg: string) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const names = Object.fromEntries(seedAutomations(0).map((a) => [a.id, a.name]));

// a run that approves every person-review as soon as it waits, unless `hold` says otherwise
async function go(graph: FlowGraph, { runner = createRunner(), opts = {}, approve = true, reject = null }: { runner?: Runner; opts?: RunOptions; approve?: boolean; reject?: string | null } = {}) {
	const handle = runner.run(graph, opts);

	handle.subscribe((e) => {
		if (e.type !== 'step.waiting') return;
		if (reject) queueMicrotask(() => handle.reject(e.nodeId, reject));
		else if (approve) queueMicrotask(() => handle.approve(e.nodeId, 'ok'));
	});

	return handle.result;
}

const ran = (rec: RunRecord) => rec.steps.filter((s) => s.status === 'done').map((s) => s.nodeId);
const failed = (rec: RunRecord) => rec.steps.filter((s) => s.status === 'failed').map((s) => s.nodeId);
const sample = (id: string) => SEED_GRAPHS[id]();
const patch = (graph: FlowGraph, nodeId: string, rules: Record<string, string>) => { const n = graph.nodes.find((x) => x.id === nodeId)!; n.rules = { ...(n.rules ?? {}), ...rules }; return graph; };
const T = (id: string, kind: Node['kind'], rules?: Record<string, string>, extra = {}): Node => ({ id, kind, x: 0, y: 0, title: id, description: '', ...(rules ? { rules } : {}), ...extra });
const E = (source: string, target: string, port: FlowGraph['edges'][number]['port'] = 'out'): FlowGraph['edges'][number] => ({ id: `${source}>${target}:${port}`, source, port, target });

// ── 1. the ten samples simulate along the path their data points to ─────────────
{
	const r = await go(sample('jev'));
	eq(ran(r), ['jev-prompt', 'jev-resumed', 'jev-classify', 'jev-complex', 'jev-plan', 'jev-edit', 'jev-handoff'], 'Jev Router default path (score 0.82 goes to Sol)');
	ok(r.status === 'done' && r.simulated, 'Jev Router is a done, simulated run');
	ok(r.steps.find((s) => s.nodeId === 'jev-complex')!.port === 'true', 'Jev: the branch left by TRUE');

	eq(ran(await go(sample('jev'), { opts: { trigger: { prompt: 'x', session: { id: 7 } } } })), ['jev-prompt', 'jev-resumed', 'jev-resume'], 'Jev Router with a saved session resumes with Luna');
	eq(ran(await go(patch(sample('jev'), 'jev-classify', { sampleOutput: '{"label":"simple","score":0.2}' }))), ['jev-prompt', 'jev-resumed', 'jev-classify', 'jev-complex', 'jev-simple'], 'Jev Router with score 0.2 goes to Luna');
}
{
	const r = await go(sample('json'));
	eq(ran(r), ['json-start', 'json-read', 'json-valid', 'json-convert', 'json-write'], 'JSON to Markdown, valid file');
	const md = r.steps.find((s) => s.nodeId === 'json-convert')!.output as string;
	ok(md.startsWith('# Weekly metrics') && md.includes('- **visits:** 1200') && md.includes('## sources') && md.includes('- search') === false && md.includes('- **search:** 700'), `JSON to Markdown output is wrong: ${JSON.stringify(md).slice(0, 120)}`);
	eq(ran(await go(patch(sample('json'), 'json-read', { sampleOutput: '{"error":"Unexpected token }"}' }))), ['json-start', 'json-read', 'json-valid', 'json-repair', 'json-write'], 'JSON to Markdown, invalid file goes to repair');
}
{
	eq(ran(await go(sample('wiki'))), ['wiki-source', 'wiki-read', 'wiki-extract', 'wiki-exists', 'wiki-merge', 'wiki-links', 'wiki-write', 'wiki-index'], 'LLM Wiki, page exists: merge');
	eq(ran(await go(patch(sample('wiki'), 'wiki-extract', { sampleOutput: '{"pageExists":false}' }))).includes('wiki-draft'), true, 'LLM Wiki, new page: draft');
}
{
	const r = await go(sample('pr'));
	ok(ran(r).includes('pr-approve') && !ran(r).includes('pr-changes') && ran(r).at(-1) === 'pr-notify', 'Pull request with no blocking issue is approved');
	const r2 = await go(patch(sample('pr'), 'pr-review', { sampleOutput: '{"blocking":2}' }));
	ok(ran(r2).includes('pr-changes') && !ran(r2).includes('pr-approve') && ran(r2).at(-1) === 'pr-notify', 'Pull request with blocking issues asks for changes, and the join still runs');
}
{
	const waits: string[] = [];
	const handle = createRunner().run(sample('support'));
	handle.subscribe((e) => { if (e.type === 'step.waiting') waits.push(e.nodeId); if (e.type === 'run.paused') waits.push('paused'); });
	await new Promise((r) => setTimeout(r, 20));
	ok(handle.snapshot().status === 'paused' && waits.includes('support-approve'), 'Support Triage pauses at the person review');
	ok(!ran(handle.snapshot()).includes('support-send'), 'Support Triage has not sent before approval');
	handle.approve('support-approve', 'looks fine');
	const r = await handle.result;
	eq(ran(r), ['support-email', 'support-classify', 'support-urgent', 'support-draft', 'support-approve', 'support-send', 'support-tag'], 'Support Triage, normal request, once approved');
	ok(r.status === 'done', 'Support Triage finishes after approval');
	const urgent = await go(patch(sample('support'), 'support-classify', { sampleOutput: '{"urgency":"urgent"}' }));
	ok(ran(urgent).includes('support-page') && !ran(urgent).includes('support-draft') && ran(urgent).at(-1) === 'support-tag', 'Support Triage, urgent request pages on-call and still tags');
	const rejected = await go(sample('support'), { reject: 'tone is off' });
	ok(rejected.status === 'failed' && /Rejected: tone is off/.test(rejected.error ?? ''), `Support Triage rejected: ${rejected.status} ${rejected.error}`);
	ok(!ran(rejected).includes('support-send'), 'a rejected reply is never sent');
}
{
	const r = await go(sample('meeting'));
	eq(ran(r), ['meeting-upload', 'meeting-text', 'meeting-summary', 'meeting-tasks', 'meeting-notes', 'meeting-share'], 'Meeting Notes runs every step in order');
}
{
	const r = await go(sample('report'));
	eq(ran(r).length, 8, 'Weekly Report runs 8 steps');
	const rows = r.steps.find((s) => s.nodeId === 'report-json')!.output as { visits: number }[];
	ok(Array.isArray(rows) && rows.length === 2 && rows[1].visits === 1344, `Weekly Report turns the CSV into JSON rows: ${JSON.stringify(rows)}`);
	ok(r.logs.some((l) => /Would wait until Monday at 09:00/.test(l.message)), 'Weekly Report says it would wait until Monday');
	ok(r.finishedAt! - r.startedAt >= 7 * 86_400_000, 'the simulated clock moved past the 7-day delay');
}
{
	eq(ran(await go(sample('release'))).includes('release-ok'), true, 'Release Notes without breaking changes formats the entry');
	const r = await go(patch(sample('release'), 'release-group', { sampleOutput: '{"breaking":true}' }));
	ok(ran(r).includes('release-migrate') && !ran(r).includes('release-ok'), 'Release Notes with a breaking change writes a migration note');
	ok(ran(r).at(-1) === 'release-write', 'Release Notes ends by writing the changelog');
}
{
	const r = await go(sample('translate'));
	eq(ran(r).filter((x) => x.startsWith('translate-')).length, 5, 'Translate a Post runs every step');
	const strict = await go(patch(sample('translate'), 'translate-score', { threshold: '0.95' }));
	ok(strict.status === 'failed' && /Score above threshold failed: 0.91 is not above 0.95/.test(strict.error ?? ''), `Translate with a high threshold fails the review: ${strict.error}`);
}
{
	ok(ran(await go(sample('incident'))).includes('incident-post'), 'Incident Response, recovered: post-mortem');
	const r = await go(patch(sample('incident'), 'incident-status', { sampleOutput: '{"healthy":false}' }));
	ok(ran(r).includes('incident-escalate') && !ran(r).includes('incident-post'), 'Incident Response, not recovered: escalate');
	ok(r.logs.some((l) => /Would wait 5 minutes/.test(l.message)), 'Incident Response waits 5 minutes in the simulation');
}
for (const id of Object.keys(SEED_GRAPHS)) {
	const r = await go(sample(id));
	ok(r.status === 'done' && r.finishedAt !== null && r.steps.every((s) => s.status === 'done') && r.simulated, `${names[id]}: a clean, simulated run (${r.status} ${r.error ?? ''})`);
	ok(r.steps.every((s) => s.stubbed || ['trigger', 'branch', 'transform', 'wait-until', 'time-delay', 'review'].includes(sample(id).nodes.find((n) => n.id === s.nodeId)!.kind)), `${names[id]}: only outside-world steps were stand-ins`);
	ok(!JSON.stringify(r).includes('undefined'), `${names[id]}: no undefined in the record`);
}

// ── 2. conditions ─────────────────────────────────────────────────────────────────
{
	const d = { a: { n: 5, s: 'hello world', list: ['x', 'y'], flag: true }, trigger: { who: null } };
	const c = (path: string, operator: Engine.Operator, value?: string) => check({ path, operator, value }, d);
	ok(c('a.n', 'is', '5') && c('a.n', 'is', '5.0') && !c('a.n', 'is', '6'), 'is compares numbers as numbers');
	ok(c('a.n', '>', '4') && c('a.n', '>=', '5') && c('a.n', '<', '6') && c('a.n', '<=', '5') && !c('a.n', '>', '5'), 'ordering operators');
	ok(c('a.s', 'contains', 'world') && c('a.list', 'contains', 'y') && !c('a.list', 'contains', 'z'), 'contains works on text and lists');
	ok(c('a.s', 'matches', '^hello') && !c('a.s', 'matches', '^world'), 'matches is a regular expression');
	ok(c('a.flag', 'is', 'true') && c('a.s', 'exists') && !c('trigger.who', 'exists') && !c('a.nope', 'exists'), 'exists treats null and missing as absent');
	ok(!c('a.nope', 'is', 'x') && c('a.nope', 'is not', 'x') && !c('a.nope', '>', '1'), 'a missing path fails everything but "is not"');
	ok(lookup(d, 'a.list.1') === 'y' && lookup(d, 'a.s.length') === undefined, 'lookup walks arrays by index and stops at text');
	ok(evaluate({ combine: 'any', items: [{ path: 'a.n', operator: '>', value: '9' }, { path: 'a.flag', operator: 'is', value: 'true' }] }, d) && !evaluate({ combine: 'all', items: [{ path: 'a.n', operator: '>', value: '9' }, { path: 'a.flag', operator: 'is', value: 'true' }] }, d), 'all and any combine');
	ok(evaluate({ combine: 'all', items: [] }, d), 'no conditions is true');
	eq(parseConditions('[{"field":"x.y","operator":"is","value":"1"}]').items[0].path, 'x.y', 'the older condition list is still read');
	eq(parseConditions('not json').items, [], 'bad condition text gives no conditions');
}

// ── 3. converters, schema, redaction ──────────────────────────────────────────────
{
	eq(convert({ title: 'T', a: 1, b: { c: 'x' }, l: ['p', 'q'] }, 'JSON', 'Markdown'), '# T\n\n- **a:** 1\n\n## b\n\n- **c:** x\n\n## l\n\n- p\n- q\n', 'JSON to Markdown');
	eq(convert('# T\n\n- **a:** 1\n\n## b\n\n- **c:** x\n', 'Markdown', 'JSON'), { title: 'T', a: 1, b: { c: 'x' } }, 'Markdown back to JSON');
	eq(convert('a,b\n1,"x, y"\n', 'CSV', 'JSON'), [{ a: 1, b: 'x, y' }], 'CSV to JSON, quotes and commas');
	eq(convert([{ a: 1, b: 'x, y' }], 'JSON', 'CSV'), 'a,b\n1,"x, y"\n', 'JSON to CSV');
	eq(convert('# Hi\n\n- one\n', 'Markdown', 'HTML'), '<h1>Hi</h1>\n<ul>\n<li>one</li>\n</ul>\n', 'Markdown to HTML');
	eq(convert('<h2>Hi</h2><p>there</p>', 'HTML', 'Text'), 'Hi\nthere\n', 'HTML to text');
	eq(convert('same', 'Text', 'Text'), 'same', 'same format passes through');
	try { convert('x', 'CSV', 'HTML'); ok(false, 'an unsupported pair should throw'); } catch (e) { ok(/no converter from CSV to HTML/i.test((e as Error).message), 'an unsupported pair says so'); }
	try { convert('{bad', 'JSON', 'Markdown'); ok(false, 'bad JSON should throw'); } catch (e) { ok(/not valid JSON/.test((e as Error).message), 'bad JSON input says so'); }
	eq(checkSchema({ a: 1, b: 'x' }, { type: 'object', required: ['a', 'c'], properties: { a: { type: 'string' } } }), ['$.c: is required', '$.a: expected string, got integer'], 'schema problems');
	eq(checkSchema([1, 2], { type: 'array', items: { type: 'number', maximum: 1 } }), ['$[1]: must be at most 1'], 'schema items');
	const secrets = secretsFrom({ API_KEY: 'sk-live-12345', NAME: 'visible', TOKEN: 'ab' }, ['extra-secret']);
	eq(secrets, ['extra-secret', 'sk-live-12345'], 'which env values count as secrets');
	eq(redact({ a: 'x sk-live-12345 y', b: ['extra-secret'] }, secrets), { a: 'x ••• y', b: ['•••'] }, 'redaction works through objects and lists');
	eq(resolveRefs('k=${env.API_KEY} ${secret.NAME} ${env.MISSING}', { API_KEY: 'v', NAME: 'n' }), 'k=v n ${env.MISSING}', 'references resolve, unknown ones stay');
	ok(String(clip('x'.repeat(50), 10)).startsWith('xxxxxxxxxx…') && (clip({ a: 1 }, 100) as { a: number }).a === 1, 'clip cuts long values and leaves short ones');
}

// ── 4. the runner ─────────────────────────────────────────────────────────────────
{
	// a run that cannot start never starts
	try { createRunner().run({ nodes: [T('a', 'agent')], edges: [] }); ok(false, 'a graph with no trigger should throw'); } catch (e) { ok(e instanceof FlowRunError && e.problems.some((p) => p.code === 'no-trigger'), 'a graph with errors throws FlowRunError before anything runs'); }

	// events and subscription
	const g = { nodes: [T('t', 'trigger'), T('a', 'agent', { sampleOutput: '"hi"' }), T('w', 'write')], edges: [E('t', 'a'), E('a', 'w')] };
	const handle = createRunner().run(g);
	const seen: string[] = [];
	for await (const e of handle.events) {
		// not every event names a step: read the fields loosely
		const ev = e as { type: string; nodeId?: string; step?: { nodeId: string } };
		seen.push(ev.type + (ev.nodeId ? `:${ev.nodeId}` : '') + (ev.step ? `:${ev.step.nodeId}` : ''));
	}
	const rec = await handle.result;
	ok(seen[0] === 'run.started' && seen.at(-1) === 'run.finished', 'events begin with run.started and end with run.finished');
	eq(seen.filter((x) => x.startsWith('edge.taken')).length, rec.traversed.length, 'one edge.taken per connection walked');
	eq(seen.filter((x) => x.startsWith('step.finished')), ['step.finished:t', 'step.finished:a', 'step.finished:w'], 'steps finish in order');
	eq(rec.traversed, ['t>a:out', 'a>w:out'], 'the record lists the connections walked');
	eq(rec.output, { w: { path: 'the output', written: false } }, 'the run output is what the last step produced');
	ok(rec.logs.every((l) => l.runId === rec.id && ['debug', 'info', 'success', 'warning', 'error'].includes(l.level)), 'every log entry belongs to its run and has a known level');

	// join on activated: a dead branch must not block the join
	const diamond = { nodes: [T('t', 'trigger'), T('b', 'branch', { conditions: '{"combine":"all","items":[{"path":"trigger.x","operator":"is","value":"1"}]}' }), T('l', 'agent'), T('r', 'agent'), T('j', 'agent')], edges: [E('t', 'b'), E('b', 'l', 'true'), E('b', 'r', 'false'), E('l', 'j'), E('r', 'j')] };
	eq(ran(await go(diamond, { opts: { trigger: { x: 1 } } })), ['t', 'b', 'l', 'j'], 'a join runs when only one of its branches was taken');
	eq(ran(await go(diamond, { opts: { trigger: { x: 2 } } })), ['t', 'b', 'r', 'j'], 'and when only the other was');
	// a join waits for every branch that is alive
	const fan = { nodes: [T('t', 'trigger'), T('a', 'agent', { sampleOutput: '1' }), T('b', 'agent', { sampleOutput: '2' }), T('j', 'agent')], edges: [E('t', 'a'), E('t', 'b'), E('a', 'j'), E('b', 'j')] };
	const fr = await go(fan, { runner: createRunner({ limits: { maxParallel: 1 } }) });
	eq(ran(fr), ['t', 'a', 'b', 'j'], 'fan-out then join, one at a time, in graph order');
	eq(fr.steps.find((s) => s.nodeId === 'j')!.input, { a: 1, b: 2 }, 'a join gets its inputs keyed by source step');

	// parallel steps overlap
	let live = 0; let peak = 0;
	const slow = createRunner({ executors: { agent: async () => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 15)); live--; return { output: 1 }; } }, limits: { maxParallel: 3 } });
	await go({ nodes: [T('t', 'trigger'), T('a', 'agent'), T('b', 'agent'), T('c', 'agent')], edges: [E('t', 'a'), E('t', 'b'), E('t', 'c')] }, { runner: slow });
	ok(peak === 3, `three steps ran at once, peak was ${peak}`);
	live = 0; peak = 0;
	await go({ nodes: [T('t', 'trigger'), T('a', 'agent'), T('b', 'agent'), T('c', 'agent')], edges: [E('t', 'a'), E('t', 'b'), E('t', 'c')] }, { runner: createRunner({ executors: { agent: async () => { live++; peak = Math.max(peak, live); await new Promise((r) => setTimeout(r, 5)); live--; return { output: 1 }; } }, limits: { maxParallel: 1 } }) });
	ok(peak === 1, `maxParallel 1 ran one at a time, peak was ${peak}`);
}
{
	// failure policies
	let tries = 0;
	const flaky = { agent: async (ctx: Engine.StepContext) => { if (ctx.step.id === 'f' && ++tries < 3) throw new Error('flaky'); return { output: 'fine' }; } };
	const g = (rules: Record<string, string>): FlowGraph => ({ nodes: [T('t', 'trigger'), T('f', 'agent', rules), T('n', 'agent')], edges: [E('t', 'f'), E('f', 'n')] });
	const retried = await go(g({ onError: 'retry', attempts: '3', backoffMs: '10' }), { runner: createRunner({ executors: flaky }) });
	ok(retried.status === 'done' && tries === 3 && retried.steps.find((s) => s.nodeId === 'f')!.attempt === 3, `retry succeeded on the third try (${tries} tries, ${retried.status})`);
	ok(retried.logs.filter((l) => /Attempt \d of 3 failed/.test(l.message)).length === 2, 'each failed attempt is logged');
	tries = 0;
	const stopped = await go(g({}), { runner: createRunner({ executors: flaky }) });
	ok(stopped.status === 'failed' && failed(stopped).includes('f') && !ran(stopped).includes('n') && /flaky/.test(stopped.error ?? ''), 'the default policy stops the run at the failing step');
	tries = 0;
	const carried = await go(g({ onError: 'continue' }), { runner: createRunner({ executors: flaky }) });
	ok(carried.status === 'done' && ran(carried).includes('n') && (carried.steps.find((s) => s.nodeId === 'n')!.input as { error: string }).error === 'flaky', 'continue passes the error along and the run goes on');

	// timeout
	const hang = await go({ nodes: [T('t', 'trigger'), T('h', 'agent', { timeoutMs: '25' })], edges: [E('t', 'h')] }, { runner: createRunner({ executors: { agent: () => new Promise(() => {}) } }) });
	ok(hang.status === 'failed' && /took longer than 25 ms/.test(hang.error ?? ''), `a step that hangs times out: ${hang.error}`);

	// stop
	const sh = createRunner({ executors: { agent: (ctx) => new Promise((_, rej) => ctx.signal.addEventListener('abort', () => rej(ctx.signal.reason))) } }).run({ nodes: [T('t', 'trigger'), T('h', 'agent')], edges: [E('t', 'h')] });
	setTimeout(() => sh.stop(), 15);
	const sr = await sh.result;
	ok(sr.status === 'stopped' && sr.finishedAt !== null, `stop ends the run as stopped (${sr.status})`);

	// deadline
	const dl = await createRunner({ limits: { deadlineMs: 30 }, executors: { agent: (ctx) => new Promise((_, rej) => ctx.signal.addEventListener('abort', () => rej(ctx.signal.reason))) } }).run({ nodes: [T('t', 'trigger'), T('h', 'agent')], edges: [E('t', 'h')] }).result;
	ok(dl.status === 'failed' && /deadline/.test(dl.error ?? ''), `the deadline ends a run: ${dl.error}`);

	// loops are bounded
	const loop = { nodes: [T('t', 'trigger'), T('a', 'agent'), T('b', 'branch', { conditions: '{"combine":"all","items":[]}' }), T('end', 'agent')], edges: [E('t', 'a'), E('a', 'b'), E('b', 'a', 'true'), E('b', 'end', 'false')] };
	const lr = await go(loop);
	ok(lr.steps.filter((s) => s.nodeId === 'a').length === 10 && lr.logs.some((l) => /has run 10 times/.test(l.message)), `a loop stops at ten visits: ${lr.steps.filter((s) => s.nodeId === 'a').length} runs of a`);
	const cap = await go(loop, { runner: createRunner({ limits: { maxSteps: 6, maxVisitsPerStep: 99 } }) });
	ok(cap.status === 'failed' && /limit of 6 steps/.test(cap.error ?? ''), `the step limit ends a run: ${cap.error}`);
}
{
	// human review: pause, persist, resume after a "reload", reject
	const g = { nodes: [T('t', 'trigger'), T('p', 'review', { check: 'Human approves' }), T('n', 'agent', { sampleOutput: '"after"' })], edges: [E('t', 'p'), E('p', 'n')] };
	const store = memoryRunStore();
	const first = createRunner({ store });
	const h = first.run(g, { flowId: 'demo' });
	await new Promise((r) => setTimeout(r, 25));
	ok(h.snapshot().status === 'paused', 'the run pauses at a person review');
	const saved = await store.get(h.id);
	ok(saved?.status === 'paused' && saved.state?.waiting.includes('p'), 'a paused run is saved with what it needs to carry on');
	h.stop();
	await h.result;

	const second = createRunner({ store });
	const again = second.resume(g, structuredClone({ ...saved!, status: 'paused' }));
	await new Promise((r) => setTimeout(r, 10));
	ok(again.snapshot().status === 'paused', 'a resumed run is still waiting for the person');
	again.approve('p', 'approved after reload');
	const done = await again.result;
	ok(done.status === 'done' && ran(done).includes('n') && (done.steps.find((s) => s.nodeId === 'p')!.output as { note: string }).note === 'approved after reload', `a run resumed from the store finishes once approved (${done.status})`);
	try { second.resume(g, { ...done }); ok(false, 'a finished run cannot resume'); } catch (e) { ok(/Only a paused run/.test((e as Error).message), 'only a paused run can resume'); }
}
{
	// adapters make steps real
	const calls: unknown[][] = [];
	const secret = 'sk-secret-123456';
	const runner = createRunner({
		env: { API_KEY: secret },
		adapters: {
			agents: { 'Jev (classifier)': async (c) => { calls.push(['agent', c.model, c.prompt]); return { label: 'complex', score: 0.9, echo: secret }; } },
			storage: { read: async (p) => { calls.push(['read', p]); return 'file text'; }, write: async (p, d) => { calls.push(['write', p, d]); } },
			http: { allow: ['hooks.example.com'], fetch: async (url, init) => { calls.push(['http', url, init.method]); return { status: 200, text: async () => 'ok' }; } },
			mail: { send: async (m) => { calls.push(['mail', m.subject]); return { sent: true }; } },
			records: { update: async (c) => { calls.push(['record', c.action, c.value]); return { updated: true }; } }
		}
	});
	const g = { nodes: [T('t', 'trigger'), T('r', 'read', { source: 'in/${env.API_KEY}.txt' }), T('a', 'agent', { model: 'Jev (classifier)', prompt: 'Rate ${env.API_KEY}' }), T('w', 'write', { target: 'out.txt' }), T('h', 'send-webhook', { url: 'https://hooks.example.com/x' }), T('m', 'send-email', { subject: 'Done' }), T('u', 'update-record', { action: 'Add tag', value: 'ok' })], edges: [E('t', 'r'), E('r', 'a'), E('a', 'w'), E('w', 'h'), E('h', 'm'), E('m', 'u')] };
	const r = await go(g, { runner });
	ok(r.status === 'done' && !r.simulated && r.steps.every((s) => !s.stubbed || s.nodeId === 't'), `with every adapter set the run is real (${r.status}, simulated ${r.simulated})`);
	eq(calls.map((c) => c[0]), ['read', 'agent', 'write', 'http', 'mail', 'record'], 'every adapter was called, in order');
	ok(calls[0][1] === `in/${secret}.txt` && calls[1][2] === `Rate ${secret}`, 'the adapters receive the resolved ${env.*} values');
	ok(!JSON.stringify(r).includes(secret), 'the secret appears nowhere in the saved record (logs, inputs, outputs)');
	ok(JSON.stringify(r).includes('•••'), 'it was blanked, not dropped');

	// an unlisted host is refused and logged
	const blocked = await go({ nodes: [T('t', 'trigger'), T('h', 'send-webhook', { url: 'https://evil.example.net/steal' })], edges: [E('t', 'h')] }, { runner: createRunner({ adapters: { http: { allow: ['hooks.example.com'], fetch: async () => { throw new Error('should not be called'); } } } }) });
	ok(blocked.status === 'failed' && /not allowed/.test(blocked.error ?? '') && blocked.logs.some((l) => l.level === 'error' && /not on the list/.test(l.message)), 'a call to a host that is not listed is refused and logged');
	const empty = await go({ nodes: [T('t', 'trigger'), T('h', 'send-webhook', { url: 'https://hooks.example.com/x' })], edges: [E('t', 'h')] }, { runner: createRunner({ adapters: { http: { allow: [], fetch: async () => ({ status: 200, text: async () => '' }) } } }) });
	ok(empty.status === 'failed', 'an empty allow list refuses everything');
	const badStatus = await go({ nodes: [T('t', 'trigger'), T('h', 'send-webhook', { url: 'https://hooks.example.com/x' })], edges: [E('t', 'h')] }, { runner: createRunner({ adapters: { http: { allow: ['hooks.example.com'], fetch: async () => ({ status: 500, text: async () => 'boom' }) } } }) });
	ok(badStatus.status === 'failed' && /answered 500/.test(badStatus.error ?? ''), 'a 500 answer fails the step');

	// tests adapter, schema review, threshold review
	const rv = (check: string, rules: Record<string, string>, adapters?: Engine.Adapters) => go({ nodes: [T('t', 'trigger'), T('x', 'agent', { sampleOutput: '{"a":1,"score":0.7}' }), T('r', 'review', { check, ...rules })], edges: [E('t', 'x'), E('x', 'r')] }, { runner: createRunner({ adapters }) });
	ok((await rv('Tests pass', {}, { tests: { run: async () => ({ pass: false, detail: '2 failed' }) } })).error?.includes('2 failed'), 'a failing tests adapter fails the review');
	ok((await rv('Tests pass', {}, { tests: { run: async () => ({ pass: true }) } })).status === 'done', 'a passing tests adapter passes it');
	ok((await rv('Schema valid', { schema: '{"type":"object","required":["a"]}' })).status === 'done', 'schema valid passes a fitting output');
	ok((await rv('Schema valid', { schema: '{"type":"object","required":["zzz"]}' })).error?.includes('$.zzz: is required'), 'schema valid fails a misfit and says where');
	ok((await rv('Score above threshold', { path: 'x.score', threshold: '0.5' })).status === 'done' && (await rv('Score above threshold', { path: 'x.score', threshold: '0.9' })).status === 'failed', 'threshold review compares the score');

	// a child workflow
	const child = { graph: { nodes: [T('ct', 'trigger'), T('ca', 'agent', { sampleOutput: '"child answer"' })], edges: [E('ct', 'ca')] }, meta: { id: 'child', name: 'Child', description: '' } };
	const parent = { nodes: [T('t', 'trigger'), T('w', 'run-workflow', { automation: 'Child' }), T('z', 'agent')], edges: [E('t', 'w'), E('w', 'z')] };
	const pr = await go(parent, { runner: createRunner({ adapters: { flows: { get: async (id) => (id === 'Child' ? child : undefined) } } }) });
	ok(pr.status === 'done' && pr.steps.find((s) => s.nodeId === 'z')!.input === 'child answer', 'Run Workflow starts the other workflow and passes its answer on');
}
{
	// run store, hash, clocks, log size
	const s = memoryRunStore();
	const mk = (id: string, t: number, flowId = 'f'): RunRecord => ({ id, flowId, flowName: 'F', flowHash: 'x', status: 'done', trigger: null, startedAt: t, finishedAt: t, steps: [], logs: [], traversed: [], output: {}, simulated: true });
	for (let i = 1; i <= 5; i++) await s.put(mk(`r${i}`, i, i % 2 ? 'a' : 'b'));
	eq((await s.list()).map((r) => r.id), ['r5', 'r4', 'r3', 'r2', 'r1'], 'the store lists newest first');
	eq((await s.list('a')).map((r) => r.id), ['r5', 'r3', 'r1'], 'and by workflow');
	await s.prune(2);
	eq((await s.list()).map((r) => r.id), ['r5', 'r4'], 'prune keeps the newest');
	await s.delete('r4');
	ok((await s.get('r4')) === undefined && (await s.get('r5'))!.id === 'r5', 'delete and get');

	const dir = mkdtempSync(join(tmpdir(), 'runs-'));
	const fs = fileRunStore(join(dir, 'runs.json'));
	await fs.put(mk('x1', 1)); await fs.put(mk('x2', 2));
	eq((await fs.list()).map((r) => r.id), ['x2', 'x1'], 'the file store keeps runs across calls');
	await fs.prune(1);
	eq((await fs.list()).map((r) => r.id), ['x2'], 'the file store prunes');
	rmSync(dir, { recursive: true });

	const keep = createRunner({ limits: { keepRuns: 3 } });
	for (let i = 0; i < 6; i++) await go(sample('meeting'), { runner: keep });
	ok((await keep.store.list()).length === 3, 'a runner keeps only the last few runs');

	const g = sample('jev');
	const h1 = behaviourHash(g);
	const moved = sample('jev'); moved.nodes[0].x += 500; moved.nodes[0].view = { look: 'card' }; moved.edges[0].dash = 'dot';
	ok(behaviourHash(moved) === h1, 'moving a step or restyling it does not change the behaviour hash');
	const changed = sample('jev'); changed.nodes[3].rules!.prompt = 'different';
	ok(behaviourHash(changed) !== h1, 'changing a rule does');

	const big = await go({ nodes: [T('t', 'trigger'), T('a', 'agent')], edges: [E('t', 'a')] }, { runner: createRunner({ limits: { logDataChars: 50 }, executors: { agent: async (ctx) => { ctx.log('info', 'big', { blob: 'x'.repeat(500) }); return { output: 1 }; } } }) });
	ok(String(big.logs.find((l) => l.message === 'big')!.data).length < 140 && /more characters/.test(String(big.logs.find((l) => l.message === 'big')!.data)), 'a long log value is clipped');

	const t0 = Date.now();
	const long = await go({ nodes: [T('t', 'trigger'), T('d', 'time-delay', { amount: '2', unit: 'days' })], edges: [E('t', 'd')] }, { runner: createRunner({ clock: fastClock(1_000_000) }) });
	ok(Date.now() - t0 < 500 && long.finishedAt! - long.startedAt === 2 * 86_400_000, 'a simulated 2-day delay takes no real time but moves the clock 2 days');
	const t1 = Date.now(); await realClock.sleep(30); ok(Date.now() - t1 >= 25, 'the real clock really waits');
	const ac = new AbortController(); const sleeping = realClock.sleep(5000, ac.signal).then(() => 'woke', () => 'aborted'); ac.abort(new Error('x'));
	ok((await sleeping) === 'aborted', 'a sleep can be aborted');

	// a trigger payload reaches the first step, and from starts mid-flow
	const pay = await go({ nodes: [T('t', 'trigger'), T('a', 'agent')], edges: [E('t', 'a')] }, { opts: { trigger: { hello: 'world' } } });
	eq(pay.steps.find((x) => x.nodeId === 'a')!.input, { hello: 'world' }, 'the trigger payload is the first step\'s input');
	const mid = await go({ nodes: [T('t', 'trigger'), T('a', 'agent'), T('b', 'agent')], edges: [E('t', 'a'), E('a', 'b')] }, { opts: { from: 'a' } });
	eq(ran(mid), ['a', 'b'], '`from` starts the run at that step');
}

console.log(`${checks} checks, ${problems.length} failed`);
for (const p of problems) console.log('  ✗', p);
process.exit(problems.length ? 1 : 0);
