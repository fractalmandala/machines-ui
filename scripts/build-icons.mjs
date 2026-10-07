#!/usr/bin/env node
// Turns every src/lib/svg/<group>/<name>.svg into a Svelte component at src/lib/icons/<group>/<name>.svelte.
//
// Why: the library imports icons as components. A plain Vite app cannot import an .svg as a
// component, so a shipped `import Icon from './bolt.svg'` would give the consumer a URL string.
// A generated .svelte file needs no plugin. The root <svg> takes the caller's props (class,
// aria-*, role, width/height), which is everything the old plugin passed through.
//
//   node scripts/build-icons.mjs          write src/lib/icons
//   node scripts/build-icons.mjs --check  fail if src/lib/icons is out of date
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src/lib/svg');
const OUT = join(root, 'src/lib/icons');
const check = process.argv.includes('--check');

const files = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
		e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.svg') ? [join(dir, e.name)] : []
	);

const expected = new Map();

for (const file of files(SRC)) {
	const rel = relative(SRC, file).replace(/\.svg$/, '.svelte');
	let svg = readFileSync(file, 'utf8').replace(/<\?xml[^>]*\?>\s*/g, '').replace(/<!--[\s\S]*?-->\s*/g, '').trim();

	if (!/^<svg[\s>]/.test(svg)) throw new Error(`${relative(root, file)}: does not start with <svg>`);

	// the caller's props land on the root element
	svg = svg.replace(/^<svg\b/, '<svg').replace(/^<svg([^>]*)>/, (_, attrs) => `<svg${attrs} {...props}>`);
	expected.set(rel, `<script lang="ts">\n\tlet props: Record<string, unknown> = $props();\n</script>\n\n${svg}\n`);
}

if (check) {
	const stale = [...expected].filter(([rel, text]) => !existsSync(join(OUT, rel)) || readFileSync(join(OUT, rel), 'utf8') !== text);

	if (stale.length) {
		console.log(`[icons] ${stale.length} out of date, run \`node scripts/build-icons.mjs\``);
		process.exit(1);
	}

	console.log(`[icons] OK: ${expected.size} icons up to date`);
} else {
	rmSync(OUT, { recursive: true, force: true });

	for (const [rel, text] of expected) {
		mkdirSync(dirname(join(OUT, rel)), { recursive: true });
		writeFileSync(join(OUT, rel), text);
	}

	console.log(`[icons] ${expected.size} svg → src/lib/icons`);
}
