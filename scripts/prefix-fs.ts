#!/usr/bin/env node
// Enforces one rule: a fractalstyler class in markup is always written fs-<name>,
// never bare.
//
//   node scripts/prefix-fs.ts            list bare fractalstyler classes (exit 1 if any)
//   node scripts/prefix-fs.ts --write    prefix them
//
// A token counts as a fractalstyler class when it is in the vocabulary
// (src/lib/styles/fs.classes.json) AND the component does not define that class
// itself in its own <style> block or sibling .css file. A graph's own `.box`
// or `.bl` is a local class and stays as it is.
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parse, type AST } from 'svelte/compiler';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const vocab = new Set((JSON.parse(readFileSync(join(root, 'src/lib/styles/fs.classes.json'), 'utf8')) as string[]).map((c) => c.slice(3)));

// a class string found in the file, or (with `directive`) a class: directive
type Chunk = { start: number; end: number; text: string; directive?: string };

const walkDir = (d: string): string[] =>
	readdirSync(d).flatMap((n) => {
		const p = join(d, n);

		return statSync(p).isDirectory() ? walkDir(p) : [p];
	});

// the svelte AST is walked generically, key by key
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function walk(node: any, visit: (node: any) => void): void {
	if (!node || typeof node !== 'object') return;
	if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
	if (typeof node.type === 'string') visit(node);
	for (const k of Object.keys(node)) if (k !== 'parent' && k !== 'metadata') walk(node[k], visit);
}

function literalsIn(node: ts.Node, sf: ts.SourceFile, base: number) {
	const out: Chunk[] = [];
	const visit = (n: ts.Node) => {
		const start = n.getStart(sf);
		const end = n.getEnd();

		if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push({ start: base + start + 1, end: base + end - 1, text: n.text });
		else if (ts.isTemplateHead(n) || ts.isTemplateMiddle(n)) out.push({ start: base + start + 1, end: base + end - 2, text: n.text });
		else if (ts.isTemplateTail(n)) out.push({ start: base + start + 1, end: base + end - 1, text: n.text });

		ts.forEachChild(n, visit);
	};

	visit(node);

	return out;
}

function identifiersIn(node: ts.Node) {
	const out = new Set<string>();
	const visit = (n: ts.Node) => {
		if (ts.isIdentifier(n)) {
			const p = n.parent;

			if (!(ts.isPropertyAccessExpression(p) && p.name === n) && !(ts.isPropertyAssignment(p) && p.name === n)) out.add(n.text);
		}

		ts.forEachChild(n, visit);
	};

	visit(node);

	return out;
}

const blankComments = (text: string) => text.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

const files = walkDir(join(root, 'src')).filter((f) => f.endsWith('.svelte'));
let total = 0;
let touched = 0;

for (const path of files) {
	const src = readFileSync(path, 'utf8');
	const rel = relative(root, path);
	let ast: AST.Root;

	try {
		ast = parse(src, { modern: true });
	} catch {
		continue;
	}

	// classes this component defines itself
	const siblingCss = path.replace(/\.svelte$/, '.css');
	const own = new Set<string>();
	const defText = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n') + (existsSync(siblingCss) ? readFileSync(siblingCss, 'utf8') : '');

	for (const m of defText.matchAll(/\.([A-Za-z_][\w-]*)/g)) own.add(m[1]);

	// script constants class expressions may point at
	const decls = new Map<string, { node: ts.Expression; sf: ts.SourceFile; base: number }>();

	for (const m of blankComments(src).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
		const base = m.index + m[0].indexOf('>') + 1;
		const sf = ts.createSourceFile('s.ts', m[2], ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

		sf.forEachChild((n) => {
			if (ts.isVariableStatement(n)) {
				for (const d of n.declarationList.declarations) {
					if (ts.isIdentifier(d.name) && d.initializer) decls.set(d.name.text, { node: d.initializer, sf, base });
				}
			}
		});
	}

	// every class string in the file: { start, end, text }
	const chunks: Chunk[] = [];
	const seen = new Set<string>();
	const add = (c: Chunk) => {
		const key = `${c.start}:${c.end}`;

		if (!seen.has(key)) {
			seen.add(key);
			chunks.push(c);
		}
	};

	walk(ast.fragment, (node) => {
		if (!['RegularElement', 'Component', 'SvelteElement', 'SvelteComponent', 'SvelteSelf'].includes(node.type)) return;

		for (const a of node.attributes ?? []) {
			if (a.type === 'Attribute' && (a.name === 'class' || a.name === 'className')) {
				const parts = a.value === true ? [] : Array.isArray(a.value) ? a.value : [a.value];

				for (const part of parts) {
					if (part.type === 'Text') {
						add({ start: part.start, end: part.end, text: part.data });
					} else if (part.type === 'ExpressionTag') {
						const text = src.slice(part.expression.start, part.expression.end);
						const sf = ts.createSourceFile('e.ts', `(${text})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
						const expr = (sf.statements[0] as ts.ExpressionStatement).expression;

						literalsIn(expr, sf, part.expression.start - 1).forEach(add);

						for (const id of identifiersIn(expr)) {
							const d = decls.get(id);

							if (d) literalsIn(d.node, d.sf, d.base).forEach(add);
						}
					}
				}
			}

			if (a.type === 'ClassDirective' && vocab.has(a.name) && !own.has(a.name)) {
				chunks.push({ start: a.start, end: a.start + `class:${a.name}`.length, text: `class:${a.name}`, directive: a.name });
			}
		}
	});

	const edits: { start: number; end: number; text: string }[] = [];
	const found: string[] = [];

	for (const c of chunks) {
		if (c.directive) {
			found.push(c.directive);
			edits.push({ start: c.start, end: c.end, text: `class:fs-${c.directive}` });
			continue;
		}

		const tokens = c.text.split(/(\s+)/);
		let changed = false;
		const next = tokens.map((t) => {
			if (t && !/^\s+$/.test(t) && !t.startsWith('fs-') && vocab.has(t) && !own.has(t)) {
				found.push(t);
				changed = true;

				return `fs-${t}`;
			}

			return t;
		});

		if (changed) edits.push({ start: c.start, end: c.end, text: next.join('') });
	}

	if (!found.length) continue;

	total += found.length;
	touched++;
	console.log(`${rel}: ${[...new Set(found)].join(' ')}`);

	if (write) {
		let out = src;

		for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.text + out.slice(e.end);

		writeFileSync(path, out);
	}
}

console.log(`\n${total} bare fractalstyler class${total === 1 ? '' : 'es'} in ${touched} file${touched === 1 ? '' : 's'}${write ? ' (prefixed)' : ''}`);
process.exit(!write && total ? 1 : 0);
