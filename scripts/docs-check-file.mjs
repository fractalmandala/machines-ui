#!/usr/bin/env node
// Checks the docs of individual component files, with no build and no shared output,
// so several people (or agents) can run it at once on different files.
//
//   node scripts/docs-check-file.mjs src/lib/components/graphs/GraphKpi.svelte ...
//
// For each file it requires:
//   - a description: `<!-- @component … -->` text, or JSDoc on the props type
//   - a JSDoc sentence on every prop (except `class`)
//   - at least one @example that is valid markup, uses <ThisComponent>, and only
//     passes props the component has
//   - the props type declared in <script module>, not the instance script
// Exit code 1 if any file fails. `pnpm docs:gen:strict` runs the full pipeline.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import ts from 'typescript';
import { parse } from 'svelte/compiler';

// an example may carry its own <script>: only look for the component's scripts outside comments
const blankComments = (text) => text.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

const files = process.argv.slice(2).filter((a) => !a.startsWith('--'));
let bad = 0;

const jsdoc = (n) => {
	const d = n.jsDoc?.[n.jsDoc.length - 1];
	const c = typeof d?.comment === 'string' ? d.comment : d?.comment?.map((x) => x.text).join('');

	return c?.trim() || undefined;
};

for (const file of files) {
	// flow files are kebab-case (editor-app.svelte → EditorApp)
	const name = basename(file, '.svelte').split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join('');
	const src = readFileSync(file, 'utf8');
	const problems = [];
	const blocks = [...blankComments(src).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ module: /\bmodule\b/.test(m[1]), code: m[2] }));
	const parseTs = (code) => ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

	// the props type
	const find = (code) => {
		const found = [];
		const sf = parseTs(code);
		const interfaces = {};

		sf.forEachChild((n) => {
			if (ts.isInterfaceDeclaration(n)) interfaces[n.name.text] = n;
		});

		// an interface's own members and those it extends, within this file
		const flat = (iface) => [
			...(iface.heritageClauses ?? []).flatMap((h) => h.types.map((t) => interfaces[t.expression.getText()]).filter(Boolean).flatMap(flat)),
			...iface.members
		];

		sf.forEachChild((n) => {
			if (ts.isInterfaceDeclaration(n) && /Props$/.test(n.name.text)) found.push({ doc: jsdoc(n), members: flat(n) });
			if (ts.isTypeAliasDeclaration(n) && ts.isTypeLiteralNode(n.type) && /Props$/.test(n.name.text)) found.push({ doc: jsdoc(n), members: n.type.members });

			// a props type that is a union by look: the merged members of its parts, listed first
			if (ts.isTypeAliasDeclaration(n) && ts.isUnionTypeNode(n.type) && /Props$/.test(n.name.text)) {
				const seen = new Set();
				const members = n.type.types
					.flatMap((t) => (interfaces[t.getText()] ? flat(interfaces[t.getText()]) : []))
					.filter((m) => ts.isPropertySignature(m) && !seen.has(m.name.getText()) && seen.add(m.name.getText()));

				found.unshift({ doc: jsdoc(n), members });
			}
		});

		return found;
	};
	const inModule = blocks.filter((b) => b.module).flatMap((b) => find(b.code));
	const inInstance = blocks.filter((b) => !b.module).flatMap((b) => find(b.code));
	const propsType = inModule[0] ?? inInstance[0];

	if (!inModule.length && inInstance.length) problems.push('props type is in the instance script: move it (and the types it uses) into <script module>');
	// a component that takes no props has no props type, and that is fine
	if (!propsType && /\$props\(\)/.test(src)) problems.push('no props type found (an interface or type named …Props)');

	const comment = src.match(/<!--\s*@component([\s\S]*?)-->/)?.[1];
	// an @example containing "-->" ends the comment early and leaves a code fence open
	if (comment && (comment.match(/```/g) ?? []).length % 2) problems.push('unclosed code fence in the @component comment: an @example may contain "-->" (an HTML comment)');
	const head = comment?.split(/\n\s*@\w+/)[0].replace(/\s+/g, ' ').trim();

	if (!head && !propsType?.doc) problems.push('no description: add a <!-- @component … --> comment at the top of the file');

	const props = [];

	for (const m of propsType?.members ?? []) {
		if (!ts.isPropertySignature(m)) continue;

		const prop = m.name.getText();

		props.push(prop);

		if (prop !== 'class' && !jsdoc(m)) problems.push(`prop "${prop}": no JSDoc description`);
	}

	// examples
	const examples = [...(comment ?? '').matchAll(/@example\s*```[\w-]*\n([\s\S]*?)```/g)].map((m) => m[1]);

	if (!examples.length) problems.push('no @example: add one inside the <!-- @component --> comment');

	for (const [i, code] of examples.entries()) {
		if (code.includes('*/')) problems.push(`@example #${i + 1}: contains "*/", which ends the doc comment the tooling wraps around @component (use a different value)`);
		let ast;

		try {
			ast = parse(code, { modern: true });
		} catch (e) {
			problems.push(`@example #${i + 1}: not valid markup (${e.message.split('\n')[0]})`);
			continue;
		}

		let uses = false;
		const visit = (n) => {
			if (!n || typeof n !== 'object') return;
			if (Array.isArray(n)) return n.forEach(visit);

			if (n.type === 'Component' && n.name === name) {
				uses = true;

				for (const a of n.attributes ?? []) {
					if (a.type === 'Attribute' && ![...props, 'class', 'children'].includes(a.name)) problems.push(`@example #${i + 1}: <${name}> has no prop "${a.name}"`);
				}
			}

			for (const k of Object.keys(n)) if (k !== 'parent') visit(n[k]);
		};

		visit(ast.fragment);

		if (!uses) problems.push(`@example #${i + 1}: does not use <${name}>`);
	}

	if (problems.length) {
		bad++;
		console.log(`✗ ${file}`);
		problems.forEach((p) => console.log(`    - ${p}`));
	} else {
		console.log(`✓ ${file}`);
	}
}

console.log(`\n${files.length - bad}/${files.length} files pass`);
process.exit(bad ? 1 : 0);
