#!/usr/bin/env node
// The docs pipeline, in one command:  pnpm docs:gen
//
//   1. svelte-package          build dist (sveld documents what ships)
//   2. sveld                   components → src/docs/data/COMPONENT_API.json
//   3. extract-docs            + union values, tokens, motion, related, @example checks
//                              → src/docs/data/components.json (what /docs renders)
//
// Fails on: sveld diagnostics in any documented component, an @example that is
// not valid markup or uses a prop the component lacks, a prop declared but never
// read, and (with --strict) any undocumented prop or component.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: root, encoding: 'utf8', ...opts });

const step = (label) => console.log(`\n▸ ${label}`);
let failed = false;

step('build dist');
const pack = run('pnpm', ['exec', 'svelte-package'], { stdio: ['ignore', 'ignore', 'inherit'] });

if (pack.status !== 0) {
	process.exit(pack.status ?? 1);
}

step('sveld → COMPONENT_API.json');
const sveld = run('pnpm', ['exec', 'sveld', '--report-diagnostics', '--cache=false', '--quiet']);
const out = `${sveld.stdout ?? ''}${sveld.stderr ?? ''}`;

if (sveld.status !== 0 && sveld.status !== 4) {
	console.error(out);
	process.exit(sveld.status ?? 1);
}

// Diagnostics in the internal ui/ primitives are noise; in anything documented they are bugs.
const mine = [...out.matchAll(/^ {2}(\.\/components\/(?!ui\/)[^\n]+)\n((?: {4}- [^\n]+\n?)+)/gm)];

// sveld cannot see through a props type that is a union by look (`type XProps = A | B`); for
// those components extract-docs reads the types from the source, so its "type could not be
// inferred" notes are not defects.
const isUnionProps = (file) => /\btype\s+\w*Props\s*=\s*\w+\s*\|/.test(readFileSync(join(root, 'src/lib', file), 'utf8'));
let reported = 0;

for (const [, file, lines] of mine) {
	const keep = lines
		.split('\n')
		.filter((line) => line.trim() && !(isUnionProps(file) && line.includes('[sveld/prop-unknown-type]')));

	if (!keep.length) continue;

	reported++;
	failed = true;
	console.error(`  ✗ ${file}\n${keep.join('\n')}`);
}

console.log(reported ? `  ${reported} documented file(s) with diagnostics` : '  no diagnostics in documented components');

step('extract docs data');
const extract = run('node', ['scripts/extract-docs.mjs', ...(strict ? ['--check'] : [])], { stdio: 'inherit' });

if (extract.status !== 0) {
	failed = true;
}

process.exit(failed ? 1 : 0);
