#!/usr/bin/env node
// Compiles the library stylesheet (src/lib/styles/library.sass) into the
// single dist/style.css that consumers import:
//
//   import '@fractaldesign/machines-ui/style.css'
//
// Runs in prepack. The entry carries only the graph component vocabulary
// and scoped fallback tokens — never the app chrome (fonts, resets, docs-site
// classes), which is asserted below so an app-oriented entry can't ship by
// accident.
import { mkdirSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src/lib/styles/library.sass');
const outDir = join(root, 'dist');
const outFile = join(outDir, 'style.css');

const result = sass.compile(entry, {
	style: 'expanded',
	sourceMap: false,
	quietDeps: true
});

mkdirSync(outDir, { recursive: true });
// The prefixed fractalstyler (scripts/build-fs.mjs) rides in the same sheet.
const fs = readFileSync(join(root, 'src/lib/styles/fs.css'), 'utf8');
const css = `${result.css}\n${fs}`;

writeFileSync(outFile, css, 'utf8');
const mustHave = ['--graph-framer', '.graph.gf', 'data-graph-native-tokens'];
const mustNot = [
	'@font-face', // app-local fonts under /fonts
	'.accent-wiping', // docs-site view transitions
	'.kicker', // docs-site layout utilities
	'.fg-prose',
	'.lede',
	'accent-shimmer'
];

// Nothing in the shipped sheet may touch the page itself: every rule from the
// fractalstyler half must be anchored on an fs- class, and :root stays untouched.
// (the transitional layer wrapper, if present, is indentation we look through)
const leaks = [...fs.replace(/^@layer[^\n]*\n/gm, '').replace(/^\t/gm, '').matchAll(/^([^\s@}/*][^{]*)\{/gm)]
	.map((m) => m[1].trim())
	.filter((sel) => !/\.fs-/.test(sel) && !/^(from|to|\d+%)/.test(sel));

if (leaks.length || /:root\s*\{/.test(fs)) {
	console.error(`[build-styles] fs.css has rules not anchored on an fs- class: ${leaks.slice(0, 5).join(' | ')}`);
	process.exit(1);
}

for (const needle of mustHave) {
	if (!css.includes(needle)) {
		console.error(`[build-styles] compiled CSS is missing "${needle}" — the graph vocabulary did not make it in`);
		process.exit(1);
	}
}
for (const banned of mustNot) {
	if (css.includes(banned)) {
		console.error(`[build-styles] compiled CSS contains app chrome "${banned}" — the library entry leaked site styles`);
		process.exit(1);
	}
}

const kb = (statSync(outFile).size / 1024).toFixed(1);
console.log(`[build-styles] ${outFile} (${kb} kB)`);
