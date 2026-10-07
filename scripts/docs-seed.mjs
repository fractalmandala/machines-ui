#!/usr/bin/env node
// One-off seeding of the component docs, comments only (no behaviour change):
//
//   node scripts/docs-seed.mjs           report what it would do
//   node scripts/docs-seed.mjs --write   do it
//
//   1. the five props that repeat across the library (title, corner, palette,
//      glyphs, children) get their agreed one-sentence JSDoc where they have none
//   2. each component without an @example gets one, taken from its live preview in
//      src/docs/previews.ts, and only if it parses and passes the same checks as
//      scripts/docs-check-file.mjs (otherwise it is skipped and listed)
//
// Descriptions and every other prop sentence are left for a person: they are meaning,
// which the code does not contain.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parse } from 'svelte/compiler';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');

const SHARED = {
	title: 'Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words.',
	corner: 'Character drawn at each corner of the frame.',
	palette: 'How many accent colours the graph uses: `mono` one, `duo` two, `multi` three.',
	glyphs: 'Characters that draw the graph: a preset name (`shade`, `ascii`, `hash`, `bar`) or your own array, lightest to heaviest.',
	children: 'Content rendered inside the component.'
};

// same-length blanking: edit positions stay valid
const blankComments = (text) => text.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

const components = JSON.parse(readFileSync(join(root, 'src/docs/data/components.json'), 'utf8')).components.filter((c) => c.exported);

// ── previews: slug → [code, …] ────────────────────────────────────────────────
const psrc = readFileSync(join(root, 'src/docs/previews.ts'), 'utf8');
const psf = ts.createSourceFile('p.ts', psrc, ts.ScriptTarget.Latest, true);
const previews = new Map();

psf.forEachChild(function visit(n) {
	if (ts.isVariableDeclaration(n) && n.name.getText(psf) === 'previews' && n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
		for (const prop of n.initializer.properties) {
			if (!ts.isPropertyAssignment(prop) || !ts.isArrayLiteralExpression(prop.initializer)) continue;

			const key = prop.name.getText(psf).replace(/['"]/g, '');
			const codes = [];

			for (const el of prop.initializer.elements) {
				if (!ts.isObjectLiteralExpression(el)) continue;

				const code = el.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(psf) === 'code');

				if (code && (ts.isNoSubstitutionTemplateLiteral(code.initializer) || ts.isStringLiteral(code.initializer))) codes.push(code.initializer.text);
			}

			previews.set(key, codes);
		}
	}

	ts.forEachChild(n, visit);
});

// A preview's code is `import …` + (optional TypeScript data) + markup. As an example it
// becomes plain markup, or, when it carries data, a <script lang="ts"> block (with the
// import, so the types resolve) followed by the markup.
function toExample(code) {
	const lines = code.split('\n');
	const imports = lines.filter((l) => /^\s*import\s/.test(l));
	// an HTML comment would close the @component comment early: drop them
	const body = lines.filter((l) => !/^\s*import\s/.test(l)).join('\n').replace(/<!--[\s\S]*?-->\s*/g, '').trim();
	const firstTag = body.search(/^\s*</m);
	const data = firstTag > 0 ? body.slice(0, firstTag).trim() : '';
	const markup = firstTag > 0 ? body.slice(firstTag).trim() : body;

	if (!data) return markup;

	const indent = (t) => t.split('\n').map((l) => (l ? `\t${l}` : l)).join('\n');

	return `<script lang="ts">\n${indent([...imports.map((l) => l.trim()), '', data].join('\n').trim())}\n</script>\n\n${markup}`;
}

// the same checks as scripts/docs-check-file.mjs, on one example
function valid(code, name, props) {
	let ast;

	try {
		ast = parse(code, { modern: true });
	} catch {
		return false;
	}

	let uses = false;
	let ok = true;
	const visit = (n) => {
		if (!n || typeof n !== 'object') return;
		if (Array.isArray(n)) return n.forEach(visit);

		if (n.type === 'Component' && n.name === name) {
			uses = true;

			for (const a of n.attributes ?? []) {
				if (a.type === 'Attribute' && ![...props, 'class', 'children'].includes(a.name)) ok = false;
			}
		}

		for (const k of Object.keys(n)) if (k !== 'parent') visit(n[k]);
	};

	visit(ast.fragment);

	return uses && ok;
}

let propsDone = 0;
let examplesDone = 0;
const skipped = [];

for (const c of components) {
	const file = join(root, c.file);
	let src = readFileSync(file, 'utf8');
	const edits = [];

	// 1. shared prop sentences
	for (const m of blankComments(src).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
		const base = m.index + m[0].indexOf('>') + 1;
		const sf = ts.createSourceFile('s.ts', m[2], ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
		const type = [];

		sf.forEachChild((n) => {
			if (ts.isInterfaceDeclaration(n) && /Props$/.test(n.name.text)) type.push(n.members);
			if (ts.isTypeAliasDeclaration(n) && ts.isTypeLiteralNode(n.type) && /Props$/.test(n.name.text)) type.push(n.type.members);
		});

		for (const members of type) {
			for (const mem of members) {
				if (!ts.isPropertySignature(mem) || mem.jsDoc?.length) continue;

				const name = mem.name.getText(sf);

				if (!(name in SHARED)) continue;

				const at = base + mem.getStart(sf);
				const lineStart = src.lastIndexOf('\n', at - 1) + 1;
				const indent = src.slice(lineStart, at).match(/^\s*/)[0];

				edits.push({ at, text: `/** ${SHARED[name]} */\n${indent}` });
				propsDone++;
			}
		}
	}

	// 2. an @example from the live preview, if the file has none
	const hasComment = /<!--\s*@component/.test(src);
	const hasExample = /@example/.test(src);

	if (!hasExample) {
		const props = c.props.map((p) => p.name);
		const candidates = (previews.get(c.slug) ?? []).map(toExample);
		// `*/` ends the JS doc comment the tooling wraps around @component text
		const pick = candidates.find((code) => !code.includes('*/') && valid(code, c.name, props));

		if (!pick) {
			skipped.push(`${c.name}: no preview code that passes the example checks`);
		} else {
			const block = `@example\n\`\`\`svelte\n${pick}\n\`\`\`\n`;

			if (hasComment) {
				edits.push({ at: src.indexOf('-->', src.indexOf('@component')), text: `\n${block}` });
			} else {
				edits.push({ at: 0, text: `<!--\n@component\n\n${block}-->\n\n` });
			}

			examplesDone++;
		}
	}

	if (write && edits.length) {
		for (const e of edits.sort((a, b) => b.at - a.at)) src = src.slice(0, e.at) + e.text + src.slice(e.at);

		writeFileSync(file, src);
	}
}

console.log(`${write ? 'wrote' : 'would write'}: ${propsDone} shared prop sentences, ${examplesDone} examples`);
for (const s of skipped) console.log('  skipped:', s);
