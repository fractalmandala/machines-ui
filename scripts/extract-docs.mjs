#!/usr/bin/env node
// Reads the component sources and writes src/docs/data/components.json — the
// single data file the /docs routes render from. Everything here is derived
// from the code (TypeScript AST for props, svelte AST for markup); nothing is
// hand-copied, so a doc page cannot drift from its component.
//
//   node scripts/extract-docs.mjs          write the data file, print coverage
//   node scripts/extract-docs.mjs --check  also exit 1 on any doc gap
//
// Props, defaults, requiredness and descriptions come from sveld
// (src/docs/data/COMPONENT_API.json, written by `pnpm docs:api`). This script adds
// what sveld does not know: allowed values of union types, the CSS tokens a
// component reads, motion flags, related components and the live-preview checks.
// Without that file it falls back to reading the props itself.
//
// Extracted per component: description, props (name, type, optional, default,
// JSDoc, enumerated values of union types), snippet props, callback props,
// module-exported types, imported components, CSS classes used in the markup,
// --tokens read, and motion flags. Preview props in src/docs/previews.ts are
// validated against the extracted props.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { parse } from 'svelte/compiler';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const comps = join(root, 'src/lib/components');
const FAMILIES = ['frame', 'graphs', 'animated', 'diagram', 'flow'];
const OUT = join(root, 'src/docs/data/components.json');
const check = process.argv.includes('--check');
const declaredUnused = [];

// ── sveld's component API, when it has been generated ─────────────────────────
const API_FILE = join(root, 'src/docs/data/COMPONENT_API.json');
const api = existsSync(API_FILE)
	? new Map(JSON.parse(readFileSync(API_FILE, 'utf8')).components.map((c) => [c.moduleName, c]))
	: new Map();

// `<!-- @component … -->` text: a description, then @example / @since / @see / @deprecated tags.
// (not String.split: a zero-length match at position 0 is skipped, so a comment that
// begins with a tag would never split)
function parseComment(raw) {
	if (!raw) {
		return {};
	}

	const TAG = /(?:^|\n)[ \t]*@(example|since|see|deprecated)\b/g;
	const starts = [...raw.matchAll(TAG)];
	const head = raw.slice(0, starts[0]?.index ?? raw.length);
	const examples = [];
	let since;
	let deprecated;
	const see = [];

	starts.forEach((m, i) => {
		const body = raw.slice(m.index + m[0].length, starts[i + 1]?.index ?? raw.length);

		if (m[1] === 'example') {
			const code = body.match(/```[\w-]*\n([\s\S]*?)```/);

			examples.push((code ? code[1] : body).trim());
		} else if (m[1] === 'since') since = body.trim();
		else if (m[1] === 'deprecated') deprecated = body.trim();
		else see.push(body.trim());
	});

	return { description: head.replace(/\s*\n\s*/g, ' ').trim() || undefined, examples, since, deprecated, see };
}

const walk = (dir) =>
	readdirSync(dir).flatMap((n) => {
		const p = join(dir, n);
		return statSync(p).isDirectory() ? walk(p) : [p];
	});

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const text = (n, sf) => n.getText(sf);
const jsdoc = (n) => {
	const docs = n.jsDoc;
	if (!docs?.length) return undefined;
	const raw = docs[docs.length - 1];
	const c = typeof raw.comment === 'string' ? raw.comment : raw.comment?.map((x) => x.text).join('');
	return c?.replace(/\s*\n\s*/g, ' ').trim() || undefined;
};

// the @component comment may hold an example with its own <script>: never read that as the component's
const blankComments = (text) => text.replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

function scripts(src) {
	const blocks = [...blankComments(src).matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
	let module = '';
	let instance = '';
	for (const [, attrs, body] of blocks) {
		if (/\bmodule\b|context="module"/.test(attrs)) module += body + '\n';
		else instance += body + '\n';
	}
	return { module, instance };
}

const tsParse = (code) => ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

// ── global alias table: `type X = 'a' | 'b'` anywhere in components/ ───────────
const aliases = {};
function collectAliases(code, file) {
	const sf = tsParse(code);
	sf.forEachChild((n) => {
		if (ts.isTypeAliasDeclaration(n)) {
			const values = ts.isUnionTypeNode(n.type)
				? n.type.types.filter((t) => ts.isLiteralTypeNode(t)).map((t) => text(t.literal, sf))
				: ts.isLiteralTypeNode(n.type)
					? [text(n.type.literal, sf)]
					: [];
			aliases[n.name.text] = { values, type: text(n.type, sf), doc: jsdoc(n), file };
		}
	});
}
const allFiles = walk(comps).filter((f) => /\.(svelte|ts)$/.test(f) && !f.endsWith('.d.ts'));
for (const f of allFiles) {
	const src = readFileSync(f, 'utf8');
	collectAliases(f.endsWith('.svelte') ? scripts(src).module + scripts(src).instance : src, relative(comps, f));
}

// ── export map from components/index.ts ───────────────────────────────────────
const indexSrc = readFileSync(join(comps, 'index.ts'), 'utf8');
const exportName = {};
for (const m of indexSrc.matchAll(/export \{ default as (\w+) \} from '\.\/([^']+\.svelte)'/g)) exportName[m[2]] = m[1];
// the package root also exports the flow editor pieces
const rootSrc = readFileSync(join(root, 'src/lib/index.ts'), 'utf8');
for (const m of rootSrc.matchAll(/export \{ default as (\w+) \} from '\.\/components\/([^']+\.svelte)'/g)) exportName[m[2]] = m[1];

// ── per-component extraction ──────────────────────────────────────────────────
function classesIn(ast) {
	const set = new Set();
	const visit = (n) => {
		if (!n || typeof n !== 'object') return;
		if (Array.isArray(n)) return n.forEach(visit);
		if (n.type === 'Attribute' && n.name === 'class' && Array.isArray(n.value))
			for (const v of n.value) if (v.type === 'Text') v.data.split(/\s+/).filter(Boolean).forEach((c) => set.add(c));
		if (n.type === 'ClassDirective') set.add(n.name);
		for (const k of Object.keys(n)) if (k !== 'parent') visit(n[k]);
	};
	visit(ast.fragment);
	return [...set].sort();
}

function extract(file) {
	const src = readFileSync(file, 'utf8');
	const rel = relative(comps, file);
	const family = rel.split('/')[0];
	const name = exportName[rel] ?? basename(file, '.svelte');
	const { module, instance } = scripts(src);
	const sf = tsParse(module + '\n' + instance);

	// Props interface: the one named in `$props()` annotation, else *Props.
	let propsName;
	const defaults = {};
	const renames = {};
	sf.forEachChild((n) => {
		if (!ts.isVariableStatement(n)) return;
		for (const d of n.declarationList.declarations) {
			if (d.initializer && ts.isCallExpression(d.initializer) && text(d.initializer.expression, sf) === '$props' && ts.isObjectBindingPattern(d.name)) {
				if (d.type) propsName = text(d.type, sf);
				for (const el of d.name.elements) {
					const key = el.propertyName ? text(el.propertyName, sf) : text(el.name, sf);
					if (el.initializer) defaults[key] = text(el.initializer, sf);
					if (el.propertyName) renames[key] = text(el.name, sf);
				}
			}
		}
	});

	const interfaces = {};
	const moduleTypes = [];
	sf.forEachChild((n) => {
		if (ts.isInterfaceDeclaration(n)) {
			interfaces[n.name.text] = n;
			if (n.name.text !== propsName) moduleTypes.push({ name: n.name.text, kind: 'interface', doc: jsdoc(n) });
		}
		if (ts.isTypeAliasDeclaration(n)) moduleTypes.push({ name: n.name.text, kind: 'type', definition: text(n.type, sf), doc: jsdoc(n) });
	});
	// `type XProps = { ... }` works the same as an interface
	sf.forEachChild((n) => {
		if (ts.isTypeAliasDeclaration(n) && ts.isTypeLiteralNode(n.type) && /Props$/.test(n.name.text)) interfaces[n.name.text] ??= { name: n.name, members: n.type.members, jsDoc: n.jsDoc };
	});
	const pi = interfaces[propsName] ?? Object.values(interfaces).find((i) => /Props$/.test(i.name.text));

	const entryFor = (m) => {
		const pname = text(m.name, sf);
		const type = text(m.type, sf);
		const ids = type.match(/[A-Z]\w+/g) ?? [];
		const al = aliases[type] ?? undefined;
		const entry = {
			name: pname,
			type,
			optional: !!m.questionToken,
			default: defaults[pname],
			description: jsdoc(m)
		};
		if (al?.values?.length) entry.values = al.values;
		if (al?.doc && !entry.description) entry.alias = al.doc;
		if (/\bSnippet\b/.test(type)) entry.snippet = true;
		if (/=>/.test(type) && /^on[A-Z]/.test(pname)) entry.callback = true;
		if (ids.length && !al && !/^(Snippet|Array|Record|Partial)$/.test(ids[0])) entry.refs = [...new Set(ids)].filter((i) => aliases[i]);

		return entry;
	};

	// An interface's own members and those it extends, within this file.
	const flatMembers = (iface) => [
		...(iface.heritageClauses ?? []).flatMap((h) =>
			h.types.map((t) => interfaces[text(t.expression, sf)]).filter(Boolean).flatMap(flatMembers)
		),
		...iface.members.filter((m) => ts.isPropertySignature(m))
	];

	// A props type that is a union by `look` (`type XProps = FrameProps | CardProps`): merge the parts
	// and note, on each prop, which looks take it. A prop every part has applies to all.
	const union = sf.statements.find((n) => ts.isTypeAliasDeclaration(n) && n.name.text === propsName && ts.isUnionTypeNode(n.type));
	const unionParts = union ? union.type.types.map((t) => interfaces[text(t, sf)]).filter(Boolean) : [];
	const props = [];

	if (unionParts.length) {
		const looks = unionParts.map((part) => {
			const own = part.members.find((m) => ts.isPropertySignature(m) && text(m.name, sf) === 'look');
			return own ? text(own.type, sf).replace(/['"]/g, '') : undefined;
		});
		const merged = new Map();

		unionParts.forEach((part, index) => {
			for (const m of flatMembers(part)) {
				const key = text(m.name, sf);
				const seen = merged.get(key) ?? { member: m, in: [] };

				seen.in.push(looks[index]);
				merged.set(key, seen);
			}
		});

		for (const [key, { member, in: where }] of merged) {
			const entry = entryFor(member);

			if (key === 'look') {
				entry.type = looks.map((v) => `'${v}'`).join(' | ');
				entry.optional = true;
				entry.values = looks;
			} else if (where.length < unionParts.length) {
				entry.only = where;
			}

			props.push(entry);
		}
	} else if (pi) {
		for (const m of pi.members) {
			if (ts.isPropertySignature(m)) props.push(entryFor(m));
		}
	}

	// sveld's view of the same component: authoritative for the prop list
	const apiComp = api.get(name);

	if (apiComp) {
		const mine = new Map(props.map((p) => [p.name, p]));
		const fromApi = apiComp.props.map((p) => {
			const ours = mine.get(p.name) ?? {};
			const entry = {
				name: p.name,
				type: p.type ?? ours.type ?? 'unknown',
				optional: !p.isRequired,
				default: (p.value ?? ours.default)?.replace(/\s+/g, ' ').trim(),
				description: (p.description ?? ours.description)?.replace(/\s*\n\s*/g, ' ').trim()
			};

			for (const k of ['alias', 'values', 'refs', 'only']) if (ours[k] !== undefined) entry[k] = ours[k];
			if (p.isFunction && /^on[A-Z]/.test(p.name)) entry.callback = true;
			if (/\bSnippet\b/.test(entry.type)) entry.snippet = true;

			return entry;
		});

		// declared in the Props type but never read by the component: not a real prop
		for (const p of props) {
			if (!p.snippet && !p.only && !fromApi.some((x) => x.name === p.name)) {
				declaredUnused.push(`${name}.${p.name}: declared in Props but never read`);
			}
		}

		// snippets (children and the like) are slots to sveld; keep them in the prop list
		for (const p of props) {
			if ((p.snippet || p.only) && !fromApi.some((x) => x.name === p.name)) fromApi.push(p);
		}

		props.length = 0;
		props.push(...fromApi);
	}

	const comment = parseComment(apiComp?.componentComment);

	// description: a `<!-- @component -->` comment (sveld), else JSDoc on the props interface
	const description =
		comment.description ||
		(pi && jsdoc(pi)) ||
		parseComment(src.match(/<!--\s*@component\s*([\s\S]*?)-->/)?.[1]).description ||
		undefined;

	const imports = [];
	sf.forEachChild((n) => {
		if (ts.isImportDeclaration(n) && n.moduleSpecifier.text.endsWith('.svelte') && n.importClause?.name)
			imports.push(n.importClause.name.text);
	});

	let classes = [];
	try {
		classes = classesIn(parse(src, { modern: true }));
	} catch {}
	const tokens = [...new Set([...src.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))].sort();

	return {
		name,
		// what the docs show: the export name without its Graph prefix (imports keep `name`)
		displayName: name.replace(/^Graph(?=[A-Z])/, ''),
		slug: kebab(name),
		family,
		file: 'src/lib/components/' + rel,
		exported: rel in exportName,
		description,
		examples: comment.examples ?? [],
		since: comment.since,
		deprecated: comment.deprecated,
		props,
		slots: (apiComp?.slots ?? []).map((sl) => ({ name: sl.name ?? 'default', props: sl.slot_props })),
		moduleTypes,
		uses: imports,
		classes,
		tokens,
		motion: {
			animatedProp: props.some((p) => p.name === 'animated'),
			reveal: /use:reveal/.test(src),
			reducedMotion: /prefers-reduced-motion|reducedMotion|prefersReduced/i.test(src)
		},
		hasChildren: props.some((p) => p.snippet),
		renames
	};
}

const files = FAMILIES.flatMap((f) => walk(join(comps, f)))
	.filter((f) => f.endsWith('.svelte'))
	// flow is an app: only its exported entry points are documented
	.filter((f) => !relative(comps, f).startsWith('flow/') || relative(comps, f) in exportName)
	.sort();
const components = files.map(extract);

// ── validate previews: every example prop must exist on the component ─────────
const problems = [];
const previewFile = join(root, 'src/docs/previews.ts');
if (existsSync(previewFile)) {
	const psrc = readFileSync(previewFile, 'utf8');
	const psf = tsParse(psrc);
	const bySlugName = Object.fromEntries(components.map((c) => [c.name, c]));
	const previewSlugs = new Set();
	const visit = (n) => {
		if (ts.isObjectLiteralExpression(n) && n.properties.some((p) => p.name && ['Comp', 'frame'].includes(text(p.name, psf)))) {
			const comp = n.properties.find((p) => p.name && text(p.name, psf) === 'Comp');
			const props = n.properties.find((p) => p.name && text(p.name, psf) === 'props');
			const of = n.properties.find((p) => p.name && text(p.name, psf) === 'of');
			const target = of && ts.isPropertyAssignment(of) ? text(of.initializer, psf).replace(/['"]/g, '') : comp && ts.isPropertyAssignment(comp) && text(comp.initializer, psf);
			const c = target && bySlugName[target];
			if (c) {
				previewSlugs.add(c.slug);
				if (props && ts.isPropertyAssignment(props) && ts.isObjectLiteralExpression(props.initializer)) {
					const known = new Set(c.props.map((p) => p.name));
					for (const p of props.initializer.properties) {
						const k = p.name && text(p.name, psf);
						if (k && !known.has(k)) problems.push(`${c.name}: preview uses unknown prop "${k}"`);
					}
				}
			}
		}
		ts.forEachChild(n, visit);
	};
	visit(psf);
	for (const c of components) c.hasPreview = previewSlugs.has(c.slug);
}

// ── @example blocks must be valid markup that uses real props ─────────────────
// (sveld's own --check-examples did not catch a broken block in testing, so the
// check lives here, on Svelte's parser and the component's actual prop list)
const known = new Map(components.map((c) => [c.name, new Set([...c.props.map((p) => p.name), 'class', 'children'])]));

for (const c of components) {
	for (const [i, code] of (c.examples ?? []).entries()) {
		const where = `${c.name} @example #${i + 1}`;
		let ast;

		try {
			ast = parse(code, { modern: true });
		} catch (e) {
			problems.push(`${where}: not valid markup (${e.message.split('\n')[0]})`);
			continue;
		}

		let usesIt = false;
		const visit = (n) => {
			if (!n || typeof n !== 'object') return;
			if (Array.isArray(n)) return n.forEach(visit);

			if (n.type === 'Component' && known.has(n.name)) {
				if (n.name === c.name) usesIt = true;

				for (const a of n.attributes ?? []) {
					if (a.type === 'Attribute' && !known.get(n.name).has(a.name)) {
						problems.push(`${where}: <${n.name}> has no prop "${a.name}"`);
					}
				}
			}

			for (const k of Object.keys(n)) if (k !== 'parent') visit(n[k]);
		};

		visit(ast.fragment);

		if (!usesIt) problems.push(`${where}: does not use <${c.name}>`);
	}
}

// ── coverage ──────────────────────────────────────────────────────────────────
problems.push(...declaredUnused);
if (!api.size) problems.push('sveld API not generated: run `pnpm docs:api` (props fall back to the built-in reader)');
for (const c of components) {
	if (!c.description) problems.push(`${c.name}: no component description`);
	if (c.exported && !(c.examples ?? []).length) problems.push(`${c.name}: no @example`);
	if (c.exported && c.hasPreview === false) problems.push(`${c.name}: exported but no live preview`);
	for (const p of c.props) if (!p.description && !p.alias && p.name !== 'class') problems.push(`${c.name}.${p.name}: no description`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ components, aliases: Object.fromEntries(Object.entries(aliases).map(([k, v]) => [k, { values: v.values, type: v.type, doc: v.doc }])) }, null, '\t') + '\n');

const undoc = problems.filter((p) => /no description/.test(p)).length;
console.log(`extracted ${components.length} components (${components.reduce((n, c) => n + c.props.length, 0)} props) → ${relative(root, OUT)}`);
console.log(`gaps: ${problems.length} (${undoc} undocumented props)`);
const other = problems.filter((p) => !/no description/.test(p));
for (const p of other) console.log('  -', p);
if (check && problems.length) process.exit(1);
