import type { FlowGraph } from './types.js';

/** The shape of an MCP client's config for a workflow. */
export type McpConfig = {
	mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }>;
};

/** A name as a slug: `Jev Router` becomes `jev-router`. */
export const slug = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '-')
		.replace(/^-+|-+$/g, '') || 'workflow';

const first = (model: string | undefined) => (model ?? '').replace(/\(.*?\)/g, '').trim().split(/\s+/)[0] || 'Luna';

/**
 * The MCP server config this workflow would need if it were real: one environment variable for each
 * outside thing its steps use. Values are placeholders, never keys. The same workflow always gives the
 * same text (specs/run-export-mcp.md, section 9.1).
 */
export function mcpConfig(name: string, graph: FlowGraph): McpConfig {
	const models: Record<string, string> = {};
	const webhooks = graph.nodes.filter((n) => n.kind === 'send-webhook').length;
	let mail = false;
	let records = false;
	let files = false;
	let workflows = false;

	for (const n of graph.nodes) {
		if (n.kind === 'agent') {
			const word = first(n.rules?.model);

			models[`${word.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY`] ??= `<your ${word} key>`;
		} else if (n.kind === 'send-email') mail = true;
		else if (n.kind === 'update-record') records = true;
		else if (n.kind === 'read' || n.kind === 'write') files = true;
		else if (n.kind === 'run-workflow') workflows = true;
	}

	const env: Record<string, string> = { ...models };

	if (mail) env.MAIL_API_KEY = '<your mail key>';
	if (records) env.RECORDS_API_KEY = '<your records key>';
	for (let i = 1; i <= webhooks; i++) env[webhooks > 1 ? `WEBHOOK_URL_${i}` : 'WEBHOOK_URL'] = '<url to call>';
	if (files) env.FILES_DIR = '<folder path>';
	if (workflows) env.WORKFLOWS_DIR = '<folder path>';

	const key = slug(name);

	return { mcpServers: { [key]: { command: 'npx', args: ['-y', '<your-mcp-server>', '--workflow', key], ...(Object.keys(env).length ? { env } : {}) } } };
}

/** The config as the text shown and copied. */
export const mcpConfigText = (name: string, graph: FlowGraph) => JSON.stringify(mcpConfig(name, graph), null, 2);
