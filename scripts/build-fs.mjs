#!/usr/bin/env node
// Builds the library's copy of fractalstyler: every class prefixed `fs-`, and
// nothing that could touch the consumer's page.
//
//   node scripts/build-fs.mjs
//
// Input is the published @fractaldesign/fractalstyler package (a dev dependency,
// so the version is pinned by the lockfile and anyone can rebuild), compiled
// fresh. FRACTALSTYLER=<dir> points at another install, e.g. a local checkout
// while developing fractalstyler itself. Output:
//
//   src/lib/styles/fs.css           the stylesheet (generated, do not edit)
//   src/lib/styles/fs.classes.json  every class it defines, for the linter
//
// Only the classes the library's own code uses are kept in fs.css; the full
// vocabulary stays listed in fs.classes.json (for the linter and for
// conversion scripts). A class built from a template string cannot be seen by
// the scan: list it in src/lib/styles/fs.safelist.json.
//
// What the transform does:
//   - prefixes every class selector:  .row → .fs-row, a.nav-link → a.fs-nav-link
//   - drops anything without a class: resets, html/body/*, :root, fonts,
//     element-only rules, view transitions — a library must not restyle the page
//   - renames @keyframes with the prefix so they cannot collide
//   - gives every design token a fallback:  var(--space-xs) →
//     var(--space-xs, 0.25rem). A consumer that defines the token wins; one
//     that does not still gets a working class, and the library never writes
//     to :root. Colour tokens fall back to the dark palette, like the graphs.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import selectorParser from 'postcss-selector-parser';
import * as sass from 'sass';

export const PREFIX = 'fs-';

// TRANSITIONAL. While Tailwind is still in the build, its utilities sit in
// @layer utilities and any unlayered rule beats them. Layering this sheet (and
// the generated component css) in `components` keeps remaining Tailwind
// overrides from unconverted callers winning, exactly as tailwind-merge made
// them win. Set to false when Tailwind is removed: the sheet is then plain,
// unlayered css.
export const TRANSITIONAL_LAYER = false;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
// the package exports no package.json subpath, so find it the way node would
const installed = () => {
	for (let dir = root; dir !== dirname(dir); dir = dirname(dir)) {
		const candidate = join(dir, 'node_modules/@fractaldesign/fractalstyler');

		if (existsSync(join(candidate, 'package.json'))) {
			return candidate;
		}
	}

	throw new Error('@fractaldesign/fractalstyler is not installed: run `pnpm install`');
};
const canonical = process.env.FRACTALSTYLER ?? installed();
// published packages ship the sources under dist/styles; a checkout keeps them in src/lib/styles
const stylesDir = existsSync(join(canonical, 'dist/styles/index.sass')) ? join(canonical, 'dist/styles') : join(canonical, 'src/lib/styles');
const outCss = join(root, 'src/lib/styles/fs.css');
const outClasses = join(root, 'src/lib/styles/fs.classes.json');
const safelistFile = join(root, 'src/lib/styles/fs.safelist.json');

const version = JSON.parse(readFileSync(join(canonical, 'package.json'), 'utf8')).version;
// Everything except fonts and the site-specific partial (_09_own: mascot, logo,
// hero) — those belong to a site, not to a component library.
const PARTIALS = ['00_config', '00_tokens', '01_base', '02_dimensions', '03_typography', '04_containers', '05_layouts', '06_shells', '07_interactions', '08_visuals'];
const compiled = sass.compileString(PARTIALS.map((p) => `@use '${p}' as *;`).join('\n'), {
	quietDeps: true,
	loadPaths: [stylesDir]
}).css;
const tree = postcss.parse(compiled);

// ── tokens: light defaults, dark overrides ────────────────────────────────────
// Fractalstyler's values first, then this library's own on top: same token names,
// machines-ui's values (src/lib/styles/_00_tokens.sass). Anything that file does
// not set keeps fractalstyler's value, so the fallbacks stay complete.
const base = {};
const dark = {};
const isDarkRule = (rule) =>
	/data-mode=("?)dark\1/.test(rule.selector) ||
	(rule.parent?.type === 'atrule' && /prefers-color-scheme:\s*dark/.test(rule.parent.params));

function collectTokens(css, intoBase, intoDark) {
	postcss.parse(css).walkRules((rule) => {
		const selector = rule.selector.trim();
		const target = isDarkRule(rule) ? intoDark : selector === ':root' ? intoBase : null;

		if (!target) {
			return;
		}

		rule.walkDecls(/^--/, (decl) => {
			target[decl.prop] = decl.value;
		});
	});
}

collectTokens(compiled, base, dark);

const ownTokens = join(root, 'src/lib/styles/_00_tokens.sass');
const ownBase = {};
const ownDark = {};

collectTokens(sass.compile(ownTokens, { quietDeps: true }).css, ownBase, ownDark);
Object.assign(base, ownBase);
Object.assign(dark, ownDark);
// a token this library sets in light only must not keep a stale fractalstyler dark value
for (const name of Object.keys(ownBase)) {
	if (!(name in ownDark)) delete dark[name];
}

const VAR = /var\(\s*(--[\w-]+)\s*(,[^()]*(?:\([^()]*\)[^()]*)*)?\)/g;

// the value a token resolves to when the consumer defines nothing
function fallback(name, depth = 0) {
	const value = dark[name] ?? base[name];

	if (value === undefined || depth > 6) {
		return undefined;
	}

	return withFallbacks(value, depth + 1);
}

function withFallbacks(value, depth = 0) {
	return value.replace(VAR, (whole, name, existing) => {
		if (existing) {
			return whole;
		}

		const fb = fallback(name, depth);

		return fb === undefined ? whole : `var(${name}, ${fb})`;
	});
}

// ── which classes does the library use? ───────────────────────────────────────
const walk = (dir) =>
	readdirSync(dir).flatMap((n) => {
		const p = join(dir, n);

		return statSync(p).isDirectory() ? walk(p) : [p];
	});

export const stripComments = (text) =>
	text
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/(^|[^:])\/\/.*$/gm, '$1');

const used = new Set(existsSync(safelistFile) ? JSON.parse(readFileSync(safelistFile, 'utf8')) : []);

for (const file of walk(join(root, 'src/lib')).filter((f) => /\.(svelte|ts|js)$/.test(f))) {
	for (const m of stripComments(readFileSync(file, 'utf8')).matchAll(/(?<![\w-])(fs-[a-z0-9][a-z0-9-]*)/g)) {
		used.add(m[1]);
	}
}

// ── selectors ─────────────────────────────────────────────────────────────────
const classes = new Set();

// returns the prefixed selector, or null when it has no class to anchor on
// or uses a class the library never references
function prefixSelector(selector) {
	let anchored = true;
	let unused = false;
	const out = selectorParser((selectors) => {
		selectors.each((sel) => {
			let hasClass = false;

			sel.walkClasses((node) => {
				hasClass = true;
				node.value = PREFIX + node.value;
				classes.add(node.value);

				// the whole vocabulary ships; `used` only feeds the report

			});

			// :is()/:not() hold nested selectors the walk above already reached;
			// the top-level selector needs a class of its own to be kept
			const own = sel.nodes.some((n) => n.type === 'class');

			if (!hasClass || !own) {
				anchored = false;
			}
		});
	}).processSync(selector);

	return anchored && !unused ? out : null;
}

const keyframes = new Map();

tree.walkAtRules('keyframes', (rule) => {
	keyframes.set(rule.params, PREFIX + rule.params);
});

// ── build ─────────────────────────────────────────────────────────────────────
const out = postcss.root();
const keptAnimations = new Set();

function keep(node, into) {
	if (node.type === 'comment') {
		return;
	}

	if (node.type === 'rule') {
		// page-level view transitions are behaviour of a site, not of a component
		if (node.selector.includes('::view-transition')) {
			return;
		}

		const kept = [];

		for (const sel of node.selectors) {
			const prefixed = prefixSelector(sel);

			if (prefixed) {
				kept.push(prefixed);
			}
		}

		if (!kept.length) {
			return;
		}

		const rule = postcss.rule({ selectors: kept });

		node.each((child) => {
			if (child.type !== 'decl') {
				return;
			}

			let value = withFallbacks(child.value);

			if (/^animation(-name)?$/.test(child.prop)) {
				for (const [from, to] of keyframes) {
					value = value.replace(new RegExp(`(^|[\\s,])${from}(?=[\\s,]|$)`, 'g'), `$1${to}`);
				}
			}

			if (/^animation(-name)?$/.test(child.prop)) {
				for (const to of keyframes.values()) {
					if (value.includes(to)) {
						keptAnimations.add(to);
					}
				}
			}

			rule.append(postcss.decl({ prop: child.prop, value, important: child.important }));
		});

		if (rule.nodes?.length) {
			into.append(rule);
		}

		return;
	}

	if (node.type === 'atrule') {
		if (node.name === 'keyframes') {
			const name = keyframes.get(node.params) ?? node.params;

			// a keyframes block rides along only if a kept rule animates with it
			if (!keptAnimations.has(name)) {
				return;
			}

			const at = postcss.atRule({ name: 'keyframes', params: name });

			node.each((frame) => at.append(frame.clone()));
			into.append(at);

			return;
		}

		if (['media', 'supports', 'container', 'layer'].includes(node.name) && node.nodes) {
			// token-only dark/light blocks hold no classes and fall away here
			const at = postcss.atRule({ name: node.name, params: node.params });

			node.each((child) => keep(child, at));

			if (at.nodes?.length) {
				into.append(at);
			}
		}
	}
}

// rules first, then keyframes, so only animations a kept rule uses are emitted
tree.each((node) => node.type !== 'atrule' || node.name !== 'keyframes' ? keep(node, out) : undefined);
tree.each((node) => node.type === 'atrule' && node.name === 'keyframes' ? keep(node, out) : undefined);

const banner = `/*
 * fractalstyler v${version}, prefixed for machines-ui.
 *
 * Generated by scripts/build-fs.mjs from the canonical fractalstyler tree.
 * Do not edit: changes are overwritten on the next build.
 *
 * The whole vocabulary (the list is in fs.classes.json). Every class carries the "${PREFIX}"
 * prefix and nothing here targets bare
 * elements, :root or html/body. Tokens carry fallbacks, so a consumer's own
 * definitions win and no custom property is ever written to :root.
 */
`;

mkdirSync(dirname(outCss), { recursive: true });
const body = TRANSITIONAL_LAYER
	? `@layer theme, base, components, utilities;\n\n@layer components {\n${out.toString().replace(/^(.+)$/gm, '\t$1')}\n}`
	: out.toString();

writeFileSync(outCss, banner + body + '\n', 'utf8');
writeFileSync(outClasses, JSON.stringify([...classes].sort(), null, '\t') + '\n', 'utf8');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const bytes = Buffer.byteLength(out.toString());

	// classes meant for fractalstyler but not published there yet are not typos (see fs.pending.json)
	const pendingFile = join(root, 'src/lib/styles/fs.pending.json');
	const pending = new Set(existsSync(pendingFile) ? JSON.parse(readFileSync(pendingFile, 'utf8')) : []);
	const unknown = [...used].filter((c) => !classes.has(c) && !pending.has(c));

	console.log(`[build-fs] ${classes.size} fs- classes (${used.size} referenced by the library) → ${(bytes / 1024).toFixed(1)} kB in src/lib/styles/fs.css`);
	console.log(`[build-fs] fractalstyler v${version}, ${Object.keys(base).length} tokens given fallbacks`);

	if (unknown.length) {
		console.log(`[build-fs] not in the vocabulary (typo?): ${unknown.join(', ')}`);
	}
}
