import { components } from '../../docs/data.js';

export const prerender = true;

const FAMILY_ORDER = ['frame', 'graphs', 'animated', 'diagram', 'flow'] as const;
const FAMILY_LABEL: Record<string, string> = {
	frame: 'Frame',
	graphs: 'Graphs',
	animated: 'Animated',
	diagram: 'Diagram',
	flow: 'Flow'
};

export function load() {
	const groups = FAMILY_ORDER.map((family) => ({
		family,
		label: FAMILY_LABEL[family],
		items: components
			.filter((c) => c.family === family && c.exported)
			// the flow diagram leads the Flow group
			.sort((a, b) => Number(b.name === 'FlowCanvas') - Number(a.name === 'FlowCanvas'))
			.map((c) => ({ name: c.displayName, slug: c.slug }))
	}));


	return { groups };
}
