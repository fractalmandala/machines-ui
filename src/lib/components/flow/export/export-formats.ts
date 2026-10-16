import type { Automation } from '$lib/data/automations.js';
import { exportFlow, exportMarkdown, type FlowGraph, type TestRunLog } from '$lib/engine/index.js';
import type { RunRecord } from '$lib/engine/index.js';

export type ExportFormat = 'json' | 'markdown';

export const FORMAT_META: Record<ExportFormat, { label: string; extension: string; mime: string; description: string }> = {
	json: {
		label: 'Workflow JSON',
		extension: 'json',
		mime: 'application/json',
		description: 'Every step and connection, with its look. Import it back here, or keep it in version control.'
	},
	markdown: {
		label: 'Markdown brief',
		extension: 'md',
		mime: 'text/markdown',
		description: 'A readable outline to share with your team or paste into docs.'
	}
};

function slug(name: string) {
	return (
		name
			.toLowerCase()
			.replace(/[^\p{L}\p{N}]+/gu, '-')
			.replace(/^-+|-+$/g, '') || 'workflow'
	);
}

export function fileName(automation: Automation, format: ExportFormat) {
	return `${slug(automation.name)}.${format === 'json' ? 'flow.json' : 'md'}`;
}

/** The latest run as an export carries it, or null when there is nothing to carry. */
export function testRunOf(record: RunRecord | null): TestRunLog | null {
	if (!record?.logs.length) return null;

	return {
		startedAt: record.startedAt,
		finishedAt: record.finishedAt,
		logs: record.logs.map((log) => ({ level: log.level, message: log.message, nodeId: log.nodeId, time: log.t }))
	};
}

/** The text of an export. `testRun` is null when the toggle is off. */
export function buildExport(format: ExportFormat, automation: Automation, graph: FlowGraph, testRun: TestRunLog | null) {
	const meta = { id: automation.id, name: automation.name, description: automation.description };

	return format === 'json'
		? JSON.stringify(exportFlow(graph, meta, { testRun }), null, 2)
		: exportMarkdown(graph, meta, { testRun });
}
