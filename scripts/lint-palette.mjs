#!/usr/bin/env node
// Fails if any colour of the accent palette is written anywhere but its one source.
//
//   node scripts/lint-palette.mjs
//
// The palette lives in src/lib/core/values.ts (ACCENTS). Everything else reads it: TypeScript
// through the list, stylesheets through the generated src/lib/styles/palette.css custom properties.
// A hex value from the palette turning up in any other source file is a second copy, and a second
// copy is how a palette drifts, so it is an error. Also checks that palette.css is current.
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACCENTS } from '../src/lib/core/values.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const allowed = new Set(['src/lib/core/values.ts', 'src/lib/styles/palette.css']);
const skip = (path) => /(^|\/)(node_modules|\.svelte-kit|dist|docs\/data)(\/|$)/.test(path);
const colours = ACCENTS.map((accent) => accent.value.toLowerCase());
const pattern = new RegExp(`#(?:${colours.map((c) => c.slice(1)).join('|')})\\b`, 'gi');

const walk = (dir) =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		const rel = relative(root, path);

		if (skip(rel)) return [];

		return statSync(path).isDirectory() ? walk(path) : [path];
	});

const found = [];

for (const file of [...walk(join(root, 'src')), ...walk(join(root, 'scripts'))]) {
	const rel = relative(root, file);

	if (allowed.has(rel) || !/\.(svelte|ts|js|mjs|css|sass|md|html)$/.test(rel)) continue;

	readFileSync(file, 'utf8')
		.split('\n')
		.forEach((line, index) => {
			for (const match of line.matchAll(pattern)) found.push(`${rel}:${index + 1}: ${match[0]}`);
		});
}

for (const line of found) console.log('  ✗', line);

const current = spawnSync('node', ['scripts/build-palette.mjs', '--check'], { cwd: root, encoding: 'utf8' });

if (current.status !== 0) console.log('  ✗', (current.stderr || current.stdout).trim());

console.log(
	found.length || current.status !== 0
		? `[lint-palette] FAIL: ${found.length} stray palette colour${found.length === 1 ? '' : 's'}`
		: `[lint-palette] OK: the ${ACCENTS.length} accents are spelled only in core/values.ts`
);
process.exit(found.length || current.status !== 0 ? 1 : 0);
