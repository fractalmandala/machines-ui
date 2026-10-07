# Documenting a component

A component's docs page is generated from its source. You write the docs in the
component, run one command, and the page, its props table, its examples and its
checks all follow. Nothing is copied by hand.

```sh
pnpm docs:check:file <file>   # check one or more components, no build (safe to run in parallel)
pnpm docs:gen          # build → sveld → docs data (what /docs renders)
pnpm docs:gen:strict   # the same, and fail on any undocumented prop or component
pnpm docs:api:check    # fail if the public API changed against the committed snapshot
```

## What you write, and where

**1. The component description, with examples:** an HTML comment at the top of the
`.svelte` file, in sveld's `@component` format.

```svelte
<!--
@component
One headline number with a label, an optional hint, and a glyph sparkline.

@example
```svelte
<GraphKpi title="READS" value="12,400" label="this week" data={[4, 6, 8, 12]} />
```
-->
```

- The text before the first tag is the description (one or two sentences).
- Each `@example` is a fenced `svelte` block using the real component. The
  generator checks that it parses and that every attribute is a real prop, so an
  example can never go stale.
- Optional tags: `@since 1.2.0`, `@deprecated Use X instead.`, `@see …`.
- An example must never contain `*/` (a cron expression like `*/15`, for instance) or `-->`
  (an HTML comment): the tooling wraps the comment in a JavaScript doc comment and an HTML
  comment, and either sequence ends it early. `docs:check:file` reports both. A
  `<script lang="ts">` block inside an example is fine.

**2. Every prop, in the props type:** one JSDoc sentence per prop.

```ts
export interface GraphKpiProps {
	/** The headline figure, already formatted. */
	value: string;
	/** Trend values, oldest first. Default: none. */
	data: number[];
}
```

Put the props type (and every type it uses) in `<script module>`, **not** in the
instance script. Sveld resolves types from the module script; a type declared in
the instance script comes out as `string`, and optional props as required.

Defaults are read from the destructuring in `$props()`, so write them there and
leave them out of the prose:

```ts
let { palette = 'mono', animated = true }: GraphKpiProps = $props();
```

**3. Slots and snippets:** a `children?: Snippet` prop is listed as a slot
automatically. Name other snippets in the props type and describe them in JSDoc.

## What is generated

| Page section | Comes from |
| --- | --- |
| Description, Usage | `<!-- @component -->` text and `@example` blocks (sveld) |
| Props table: name, type, required, default, description | the props type and `$props()` (sveld) |
| Allowed values of a union prop | the union's type alias (generator) |
| Slots, callbacks | `Snippet` props and `on*` function props |
| Theming | the CSS custom properties the component reads (generator) |
| Motion / reduced motion notes | the code (generator) |
| Related components | the component's imports (generator) |
| Live preview | `src/docs/previews.ts` (props for the real component) |

## What fails the build

- an `@example` that is not valid markup, or uses a prop the component does not have
- a prop declared in the props type but never read by the component
- a sveld diagnostic in any documented component
- with `--strict`: any prop without a description, any component without a description or an `@example`
- a preview that passes a prop the component does not have

## Files

| File | Role |
| --- | --- |
| `sveld.config.js` | what sveld reads and where it writes |
| `src/docs/data/COMPONENT_API.json` | sveld's output; committed as the API snapshot |
| `src/docs/data/components.json` | the merged data the docs pages render (generated) |
| `scripts/docs-gen.mjs` | the pipeline |
| `scripts/extract-docs.mjs` | the enrichment and the example checks |
