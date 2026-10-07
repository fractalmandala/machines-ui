import { components } from '../../../docs/data.js';

export const prerender = true;

const FAMILIES = [
	['frame', 'Frame'],
	['graphs', 'Graphs'],
	['animated', 'Animated'],
	['diagram', 'Diagram'],
	['flow', 'Flow']
] as const;

// Plain-text index of every documented component, for AI crawlers and
// agents: one line per component with its page, description and prop names.
export function GET({ url }) {
	const sections = FAMILIES.flatMap(([family, label]) => {
		const items = components.filter((c) => c.family === family && c.exported);

		if (!items.length) {
			return [];
		}

		return [
			`## ${label}`,
			'',
			...items.map((c) => {
				const props = c.props.map((p) => p.name).join(', ');
				const line = `- [${c.displayName}](${new URL(`/docs/${c.slug}`, url.origin)})`;

				return [line, c.description, props && `props: ${props}`].filter(Boolean).join(' — ');
			}),
			''
		];
	});

	const body = [
		'# machines-ui',
		'',
		'> Glyph-drawn graphs, animated terminals, diagrams, the frame primitives they share, and a flow editor. Install with `pnpm add @fractaldesign/machines-ui`.',
		'',
		...sections
	].join('\n');

	return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
