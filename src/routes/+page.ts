import { components } from '../docs/data.js';

export const prerender = true;

const FAMILIES = [
	{ family: 'frame', label: 'Frame', blurb: 'The dashed character frame every graph sits in.' },
	{ family: 'graphs', label: 'Graphs', blurb: 'Stats, charts, tables and timelines drawn with glyphs.' },
	{ family: 'animated', label: 'Animated', blurb: 'Terminals, rain, fire and live readouts.' },
	{ family: 'diagram', label: 'Diagram', blurb: 'Flows, trees and system diagrams.' },
	{ family: 'flow', label: 'Flow', blurb: 'Nodes, edges and the canvas of the workflow builder.' }
] as const;

export function load() {
	const exported = components.filter((c) => c.exported);

	return {
		total: exported.length,
		families: FAMILIES.map((f) => {
			const items = exported.filter((c) => c.family === f.family);

			return { ...f, count: items.length, first: items[0]?.slug ?? '' };
		})
	};
}
