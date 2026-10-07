// Typed view over the generated src/docs/data/components.json
// (regenerate with `pnpm docs:extract`).
import raw from './data/components.json' with { type: 'json' };

export interface PropDoc {
	name: string;
	type: string;
	optional: boolean;
	default?: string;
	description?: string;
	alias?: string;
	values?: string[];
	snippet?: boolean;
	callback?: boolean;
	refs?: string[];
	/** The looks that take this prop, when only some do (a component whose props type varies by `look`). */
	only?: string[];
}

export interface TypeDoc {
	name: string;
	kind: 'interface' | 'type';
	definition?: string;
	doc?: string;
}

export interface ComponentDoc {
	/** The export name, as imported. */
	name: string;
	/** The name the docs show: `name` without its `Graph` prefix. */
	displayName: string;
	slug: string;
	family: 'frame' | 'graphs' | 'animated' | 'diagram' | 'flow';
	file: string;
	exported: boolean;
	description?: string;
	/** `@example` blocks from the component's `<!-- @component -->` comment, validated at generation time. */
	examples: string[];
	since?: string;
	deprecated?: string;
	props: PropDoc[];
	slots: { name: string; props?: string }[];
	moduleTypes: TypeDoc[];
	uses: string[];
	classes: string[];
	tokens: string[];
	motion: { animatedProp: boolean; reveal: boolean; reducedMotion: boolean };
	hasChildren: boolean;
	hasPreview?: boolean;
}

export const components = (raw as unknown as { components: ComponentDoc[] }).components;
