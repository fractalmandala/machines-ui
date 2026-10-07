#!/usr/bin/env node
// Every fs- class used in a component must exist in the generated stylesheet.
//
//   node scripts/lint-fs.mjs
//
// Catches typos and classes the canonical tree does not define (which would
// render as nothing). Run after `scripts/build-fs.mjs`.
//
// A class in src/lib/styles/fs.pending.json is one that is meant to join fractalstyler but is not
// published there yet. It is accepted only while a stylesheet in src/lib defines it (so it still
// renders and a typo still fails), and the lint says when fractalstyler has caught up and the
// entry can go.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const vocabulary = new Set(JSON.parse(readFileSync(join(root, 'src/lib/styles/fs.classes.json'), 'utf8')));
const pending = new Set(JSON.parse(readFileSync(join(root, 'src/lib/styles/fs.pending.json'), 'utf8')));
const known = new Set([...vocabulary, ...pending]);

const walk = (dir) =>
	readdirSync(dir).flatMap((n) => {
		const p = join(dir, n);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});

const problems = [];
let used = 0;

for (const file of walk(join(root, 'src/lib')).filter((f) => /\.(svelte|ts|js)$/.test(f))) {
	// comments are prose, not class usage
	const text = readFileSync(file, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/(^|[^:])\/\/.*$/gm, '$1');

	for (const m of text.matchAll(/(?<![\w-])(fs-[a-z0-9][a-z0-9-]*)/g)) {
		used++;

		if (!known.has(m[1])) {
			problems.push(`${relative(root, file)}: unknown class "${m[1]}"`);
		}
	}
}

// a pending class must be defined somewhere in the library, or it renders as nothing
const sheets = walk(join(root, 'src/lib'))
	.filter((f) => /\.(css|sass)$/.test(f) && !/fs\.css$/.test(f))
	.map((f) => readFileSync(f, 'utf8'))
	.join('\n');

for (const name of pending) {
	if (vocabulary.has(name)) console.log(`  · ${name} is in fractalstyler now: remove it from src/lib/styles/fs.pending.json`);
	else if (!new RegExp(`\\.${name}(?![\\w-])`).test(sheets)) problems.push(`pending class "${name}" is not defined in any stylesheet under src/lib`);
}

console.log(`[lint-fs] ${used} fs- references checked against ${vocabulary.size} classes (+${pending.size} pending)`);
for (const p of [...new Set(problems)]) console.log('  ✗', p);
process.exit(problems.length ? 1 : 0);
