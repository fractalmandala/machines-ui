import { components } from '../../docs/data.js';
import { previews } from '../../docs/previews.js';

export function load() {
	const exported = components.filter((c) => c.exported);
	const props = exported.flatMap((c) => c.props.filter((p) => p.name !== 'class'));
	const documented = props.filter((p) => p.description || p.alias).length;

	return {
		stats: {
			components: exported.length,
			previewed: exported.filter((c) => previews[c.slug]).length,
			props: props.length,
			documented
		},
		families: ['frame', 'graphs', 'animated', 'diagram', 'flow'].map((family) => ({
			family,
			items: [
				...exported
					.filter((c) => c.family === family)
					.map((c) => ({ name: c.displayName, slug: c.slug, description: c.description }))
			]
		}))
	};
}
