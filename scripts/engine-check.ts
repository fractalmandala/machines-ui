#!/usr/bin/env node
// Checks the headless engine (dist/engine) against the ten sample workflows, in plain Node.
//   node scripts/engine-check.ts            run the checks
//   node scripts/engine-check.ts --update   rewrite src/lib/data/sample-mcp.json from the samples
// Needs `pnpm prepack` first: it reads dist.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type * as Engine from '../src/lib/engine/index.ts';
import type * as Automations from '../src/lib/data/automations.ts';
import type { FlowGraph } from '../src/lib/engine/index.ts';

// the checks run against the build in dist, typed by the sources it is built from
// (so type-checking does not need a build)
const fromDist = async <T>(path: string): Promise<T> => import(new URL(`../dist/${path}`, import.meta.url).href);
const { FlowParseError, exportFlow, exportMarkdown, importFlow, mcpConfig, mcpConfigText, validateGraph } = await fromDist<typeof Engine>('engine/index.js');
const { SEED_GRAPHS, seedAutomations } = await fromDist<typeof Automations>('data/automations.js');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SNAP = join(root, 'src/lib/data/sample-mcp.json');
const update = process.argv.includes('--update');
const problems: string[] = [];
let checks = 0;
const ok = (cond: unknown, msg: string) => { checks++; if (!cond) problems.push(msg); };
// equal as data: the order a file lists its keys in does not matter
const canon = (v: unknown): unknown => {
	if (Array.isArray(v)) return v.map(canon);
	if (!v || typeof v !== 'object') return v;
	const o = v as Record<string, unknown>;
	return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, canon(o[k])]));
};
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

const automations = seedAutomations(0);
const snapshots: Record<string, unknown> = {};
const log = { startedAt: 1000, finishedAt: 4000, logs: [{ level: 'info', message: 'Run started', nodeId: null, time: 1000 }, { level: 'success', message: 'Done', nodeId: 'x', time: 4000 }] };

for (const a of automations) {
	const graph = SEED_GRAPHS[a.id]();
	const meta = { id: a.id, name: a.name, description: a.description };
	const tag = `${a.name}:`;

	// 1. the graph is sound
	const errs = validateGraph(graph).filter((p) => p.severity === 'error');
	ok(!errs.length, `${tag} validateGraph errors: ${errs.map((e) => e.message).join(' | ')}`);

	// 2. lossless round trip, through text and through an object
	const doc = exportFlow(graph, meta);
	const back = importFlow(JSON.stringify(doc));
	ok(same(back.graph, graph), `${tag} export → import changed the graph`);
	ok(same(importFlow(doc).graph, graph), `${tag} object import changed the graph`);
	ok(back.meta.name === a.name && back.meta.id === a.id, `${tag} name or id lost`);
	ok(!back.warnings.filter((w) => w.severity === 'error').length, `${tag} import reported errors`);
	ok(same(exportFlow(back.graph, back.meta), doc), `${tag} second export differs from the first`);

	// 3. the test run log appears only when asked for
	ok(!('testRun' in exportFlow(graph, meta)), `${tag} JSON has a testRun without the toggle`);
	ok(same(exportFlow(graph, meta, { testRun: log }).testRun, log), `${tag} JSON lost the test run`);
	ok(!/Latest test run/.test(exportMarkdown(graph, meta)), `${tag} Markdown shows a run without the toggle`);
	const md = exportMarkdown(graph, meta, { testRun: log });
	ok(/## Latest test run/.test(md) && md.includes('success: Done'), `${tag} Markdown lost the test run`);
	ok(md.startsWith(`# ${a.name}`), `${tag} Markdown has no title`);
	ok(graph.nodes.every((n) => md.includes(n.title)), `${tag} Markdown is missing a step`);

	// 4. MCP config: derived from the steps, byte-identical every time, and valid JSON
	const config = mcpConfig(a.name, graph);
	ok(mcpConfigText(a.name, graph) === mcpConfigText(a.name, SEED_GRAPHS[a.id]()), `${tag} config text is not repeatable`);
	ok(same(JSON.parse(mcpConfigText(a.name, graph)), config), `${tag} config text is not its own JSON`);
	const [key, server] = Object.entries(config.mcpServers)[0];
	ok(Object.keys(config.mcpServers).length === 1 && key === server.args.at(-1), `${tag} server name and --workflow disagree`);
	ok(Object.values(server.env ?? {}).every((v) => /^<.*>$/.test(v)), `${tag} an env value is not a placeholder`);
	ok(graph.nodes.filter((n) => n.kind === 'agent').every((n) => n.rules?.model), `${tag} an agent step declares no model`);
	snapshots[a.id] = config;
}

// 5. bad files are refused with a reason that names the problem
const refuse = (what: string, input: Parameters<typeof importFlow>[0], code: string) => {
	try { importFlow(input); ok(false, `${what}: was accepted`); }
	catch (e) { ok(e instanceof FlowParseError && e.problems.some((p) => p.code === code), `${what}: expected ${code}, got ${(e as Engine.FlowParseError).problems?.map((p) => p.code) ?? (e as Error).message}`); }
};
const good = exportFlow(SEED_GRAPHS.jev(), { id: 'jev', name: 'Jev', description: '' });
refuse('not JSON', '{nope', 'not-json');
refuse('an array', '[]', 'not-object');
refuse('no format', '{"nodes":[],"edges":[]}', 'no-format');
refuse('a newer format', JSON.stringify({ ...good, format: 'machines.flow/2' }), 'newer-format');
refuse('an unknown step type', JSON.stringify({ ...good, nodes: [{ ...good.nodes[0], kind: 'teleport' }] }), 'node-kind');
refuse('a missing position', JSON.stringify({ ...good, nodes: [{ ...good.nodes[0], position: undefined }] }), 'node-position');
refuse('a bad edge port', JSON.stringify({ ...good, edges: [{ ...good.edges[0], port: 'sideways' }] }), 'edge-port');

// 6. renamed step types are read as the new names, with a warning
const old = { ...good, nodes: [{ ...good.nodes[1], kind: 'update-subscription' }, { ...good.nodes[2], kind: 'enroll' }, good.nodes[0]], edges: [] };
const migrated = importFlow(JSON.stringify(old));
ok(migrated.graph.nodes[0].kind === 'update-record' && migrated.graph.nodes[1].kind === 'run-workflow', 'old step names were not migrated');
ok(migrated.warnings.filter((w) => w.code === 'renamed-kind').length === 2, 'the renames were not reported');

// 7. look settings: a bad value is dropped with a warning, and the rest of the file still loads
const dirty = importFlow(JSON.stringify({ ...good, nodes: good.nodes.map((n, i) => (i === 0 ? { ...n, view: { dash: 'wavy', look: 'frame', mystery: 1 } } : n)) }));
ok(dirty.graph.nodes[0].view?.look === 'frame' && !('dash' in dirty.graph.nodes[0].view) && !('mystery' in dirty.graph.nodes[0].view), 'bad look settings were not dropped');
ok(dirty.warnings.some((w) => w.code === 'view-value') && dirty.warnings.some((w) => w.code === 'view-key'), 'dropped settings were not reported');

// 8. validateGraph catches what it should
const broken = SEED_GRAPHS.jev();
broken.edges.push({ id: 'bad', source: 'jev-prompt', port: 'true', target: 'nowhere' });
broken.nodes.push({ id: 'orphan', kind: 'agent', x: 0, y: 0, title: 'Orphan', description: '' });
const codes = validateGraph(broken).map((p) => p.code);
ok(codes.includes('edge-port') && codes.includes('edge-target') && codes.includes('unreached'), `validateGraph missed a problem: ${codes}`);
ok(validateGraph({ nodes: [], edges: [] }).some((p) => p.code === 'no-trigger'), 'an empty graph has no trigger problem');
const loop: FlowGraph = { nodes: [{ id: 't', kind: 'trigger', x: 0, y: 0, title: 'T', description: '' }, { id: 'a', kind: 'agent', x: 0, y: 0, title: 'A', description: '' }, { id: 'b', kind: 'agent', x: 0, y: 0, title: 'B', description: '' }], edges: [{ id: '1', source: 't', port: 'out', target: 'a' }, { id: '2', source: 'a', port: 'out', target: 'b' }, { id: '3', source: 'b', port: 'out', target: 'a' }] };
ok(validateGraph(loop).some((p) => p.code === 'loop-no-exit'), 'a loop with no way out was not reported');

// 9. the config follows the workflow
const base: FlowGraph = { nodes: [{ id: 't', kind: 'trigger', x: 0, y: 0, title: 'T', description: '' }], edges: [] };
const envOf = (g: FlowGraph, n = 'My Flow') => Object.keys(Object.values(mcpConfig(n, g).mcpServers)[0].env ?? {});
ok(envOf(base).length === 0 && !('env' in Object.values(mcpConfig('x', base).mcpServers)[0]), 'a workflow that needs nothing outside should have no env');
const withHook: FlowGraph = { ...base, nodes: [...base.nodes, { id: 'w', kind: 'send-webhook', x: 0, y: 0, title: 'W', description: '' }] };
ok(same(envOf(withHook), ['WEBHOOK_URL']), 'a webhook step did not add WEBHOOK_URL');
const two: FlowGraph = { ...withHook, nodes: [...withHook.nodes, { id: 'w2', kind: 'send-webhook', x: 0, y: 0, title: 'W2', description: '' }] };
ok(same(envOf(two), ['WEBHOOK_URL_1', 'WEBHOOK_URL_2']), 'two webhooks should be numbered');
ok(Object.keys(mcpConfig('Weekly Report!', base).mcpServers)[0] === 'weekly-report', 'the name was not slugged');

// 10. the snapshots kept with the samples equal the derived configs
if (update) { writeFileSync(SNAP, JSON.stringify(snapshots, null, '\t') + '\n'); console.log('snapshots written →', SNAP); }
else {
	const kept: Record<string, unknown> = JSON.parse(readFileSync(SNAP, 'utf8'));
	for (const id of Object.keys(snapshots)) ok(same(kept[id], snapshots[id]), `${id}: kept MCP config differs from the derived one (run with --update after changing a sample)`);
}

console.log(`${checks} checks, ${problems.length} failed`);
for (const p of problems) console.log('  ✗', p);
process.exit(problems.length ? 1 : 0);
