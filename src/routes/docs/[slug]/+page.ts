import { error } from '@sveltejs/kit';
import { components } from '../../../docs/data.js';

export function entries() {
	return components.filter((c) => c.exported).map((c) => ({ slug: c.slug }));
}

export function load({ params }) {
	const component = components.find((c) => c.slug === params.slug && c.exported);

	if (!component) {
		error(404, `No component "${params.slug}"`);
	}

	const used = component.uses.flatMap((name) => {
		const c = components.find((x) => x.name === name);
		return c?.exported ? [{ name: c.displayName, slug: c.slug }] : [];
	});
	const usedBy = components
		.filter((c) => c.exported && c.uses.includes(component.name))
		.map((c) => ({ name: c.displayName, slug: c.slug }));

	return { component, used, usedBy };
}
