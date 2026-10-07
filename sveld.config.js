// API extraction for the docs: sveld reads the built components (dist) and writes
// one JSON document, which scripts/extract-docs.mjs enriches into the docs data.
// Run through `pnpm docs:api` (it builds dist first).
import { defineConfig } from 'sveld';

export default defineConfig({
	// the "svelte" field of package.json points at dist/index.js; analyse every
	// component beneath it rather than only what the barrel re-exports
	glob: true,
	// types come from svelte-package; this run is for documentation only
	types: false,
	json: true,
	jsonOptions: { outFile: 'src/docs/data/COMPONENT_API.json' },
	// validate every @example block (markup only: no extra TypeScript load)
	checkExamples: 'syntax'
});
