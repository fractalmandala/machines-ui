import { STEP_LABELS, type StepKind } from '$lib/core/values.js';
import type { ExportOptions } from './format.js';
import type { FlowGraph, FlowMeta } from './types.js';

const when = (ms: number | null) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : 'not recorded');

/** A readable outline of a workflow, for a team or a document. Export-only: nothing reads it back. */
export function exportMarkdown(graph: FlowGraph, meta: FlowMeta, options: ExportOptions = {}): string {
	const steps = graph.nodes.toSorted((a, b) => a.y - b.y || a.x - b.x);
	const title = (id: string) => graph.nodes.find((n) => n.id === id)?.title ?? id;
	const lines = [`# ${meta.name}`, ''];

	if (meta.description) lines.push(`> ${meta.description}`, '');

	lines.push(`**Steps:** ${steps.length}`, '', '## Steps', '');

	steps.forEach((node, index) => {
		lines.push(`${index + 1}. **${STEP_LABELS[node.kind as StepKind] ?? node.kind}** — ${node.title}`);
		if (node.description) lines.push(`   ${node.description}`);

		if (node.rules) for (const [key, value] of Object.entries(node.rules)) lines.push(`   - ${key}: ${value}`);

		for (const edge of graph.edges.filter((e) => e.source === node.id))
			lines.push(`   - ${edge.port === 'out' ? 'Then' : `If ${edge.port.toUpperCase()}`} → ${title(edge.target)}`);
	});

	const run = options.testRun;

	if (run?.logs.length) {
		lines.push('', '## Latest test run', '', `Started ${when(run.startedAt)} · finished ${when(run.finishedAt)}`, '');
		for (const log of run.logs) lines.push(`- ${log.level}: ${log.message}`);
	}

	return lines.join('\n') + '\n';
}
