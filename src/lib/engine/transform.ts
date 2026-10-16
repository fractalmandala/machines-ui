// Deterministic converters for the Transform step. Pure functions: the same input always gives the same text.

export const FORMATS = ['JSON', 'CSV', 'HTML', 'Markdown', 'Text'] as const;
export type Format = (typeof FORMATS)[number];

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const scalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v);
const text = (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2));

// ── JSON → Markdown ──────────────────────────────────────────────────────────────

function section(key: string, value: unknown, depth: number, out: string[]) {
	const level = Math.min(depth, 6);

	if (scalar(value)) { out.push(`- **${key}:** ${value}`); return; }

	out.push('', `${'#'.repeat(level)} ${key}`, '');

	if (Array.isArray(value)) {
		if (value.every(scalar)) value.forEach((v) => out.push(`- ${v}`));
		else value.forEach((v, i) => section(isObject(v) && typeof (v.name ?? v.title) === 'string' ? String(v.name ?? v.title) : `${i + 1}`, v, depth + 1, out));
	} else for (const [k, v] of Object.entries(value as object)) section(k, v, depth + 1, out);
}

export function jsonToMarkdown(value: unknown): string {
	if (scalar(value)) return String(value);

	const out: string[] = [];

	if (isObject(value)) {
		const title = value.title ?? value.name;

		if (typeof title === 'string') out.push(`# ${title}`, '');

		for (const [k, v] of Object.entries(value)) if (!((k === 'title' || k === 'name') && v === title)) section(k, v, 2, out);
	} else (value as unknown[]).forEach((v, i) => section(`${i + 1}`, v, 2, out));

	return out.join('\n').replace(/\n{3,}/g, '\n\n').replace(/^\n+/, '').trimEnd() + '\n';
}

// ── Markdown → JSON (the shape jsonToMarkdown writes) ────────────────────────────

export function markdownToJson(md: string): unknown {
	const root: Record<string, unknown> = {};
	const stack: { level: number; node: Record<string, unknown> }[] = [{ level: 0, node: root }];
	let list: string[] | null = null;
	let listKey = '';

	for (const raw of md.split('\n')) {
		const line = raw.trimEnd();
		const heading = /^(#{1,6})\s+(.*)$/.exec(line);
		const field = /^- \*\*(.+?):\*\*\s*(.*)$/.exec(line);
		const item = /^- (.*)$/.exec(line);
		const top = () => stack[stack.length - 1].node;

		if (heading) {
			const level = heading[1].length;

			if (level === 1) { root.title = heading[2]; continue; }

			while (stack.length > 1 && stack[stack.length - 1].level >= level) stack.pop();

			const child: Record<string, unknown> = {};

			stack[stack.length - 1].node[heading[2]] = child;
			stack.push({ level, node: child });
			list = null;
		} else if (field) {
			const v = field[2];

			top()[field[1]] = v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v === 'true' ? true : v === 'false' ? false : v;
			list = null;
		} else if (item) {
			const parent = stack.length > 1 ? stack[stack.length - 2].node : root;
			const key = Object.keys(parent).find((k) => parent[k] === top());

			if (!list && key) { list = []; listKey = key; parent[listKey] = list; stack.pop(); }

			list?.push(item[1]);
		}
	}

	return root;
}

// ── CSV ──────────────────────────────────────────────────────────────────────────

export function parseCsv(csv: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let quoted = false;

	for (let i = 0; i < csv.length; i++) {
		const c = csv[i];

		if (quoted) {
			if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++; }
			else if (c === '"') quoted = false;
			else cell += c;
		} else if (c === '"') quoted = true;
		else if (c === ',') { row.push(cell); cell = ''; }
		else if (c === '\n' || c === '\r') { if (c === '\r' && csv[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
		else cell += c;
	}

	if (cell !== '' || row.length) { row.push(cell); rows.push(row); }

	return rows.filter((r) => r.some((c) => c !== ''));
}

export function csvToJson(csv: string): Record<string, unknown>[] {
	const [head, ...rows] = parseCsv(csv);

	return (head ?? []).length ? rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] !== undefined && r[i] !== '' && !Number.isNaN(Number(r[i])) ? Number(r[i]) : (r[i] ?? '')]))) : [];
}

const cell = (v: unknown) => { const s = v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s; };

export function jsonToCsv(value: unknown): string {
	const rows: Record<string, unknown>[] = (Array.isArray(value) ? value : [value]).map((r: unknown) => (isObject(r) ? r : { value: r }));
	const head = [...new Set(rows.flatMap((r) => Object.keys(r)))];

	return [head.map(cell).join(','), ...rows.map((r) => head.map((h) => cell(r[h])).join(','))].join('\n') + '\n';
}

// ── Markdown, HTML, text ─────────────────────────────────────────────────────────

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');

export function markdownToHtml(md: string): string {
	const out: string[] = [];
	let open = false;

	for (const line of md.split('\n')) {
		const h = /^(#{1,6})\s+(.*)$/.exec(line);
		const li = /^[-*]\s+(.*)$/.exec(line);

		if (open && !li) { out.push('</ul>'); open = false; }
		if (h) out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
		else if (li) { if (!open) { out.push('<ul>'); open = true; } out.push(`<li>${inline(li[1])}</li>`); }
		else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
	}

	if (open) out.push('</ul>');

	return out.join('\n') + '\n';
}

export function htmlToText(html: string): string {
	return html.replace(/<\/(p|h[1-6]|li|div|ul|ol)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function htmlToMarkdown(html: string): string {
	return html.replace(/<h([1-6])[^>]*>(.*?)<\/h\1>/gis, (_, n: string, t: string) => `${'#'.repeat(Number(n))} ${t}\n`).replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n').replace(/<(strong|b)>(.*?)<\/\1>/gis, '**$2**').replace(/<code>(.*?)<\/code>/gis, '`$1`').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function markdownToText(md: string): string {
	return md.replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/`(.+?)`/g, '$1').replace(/^[-*]\s+/gm, '• ').trim() + '\n';
}

const parseJson = (v: unknown) => { if (typeof v !== 'string') return v; try { return JSON.parse(v); } catch { throw new Error('The input is not valid JSON.'); } };

export type Converter = (input: unknown) => unknown;

const CONVERTERS: Record<string, Converter> = {
	'JSON>Markdown': (v) => jsonToMarkdown(parseJson(v)),
	'Markdown>JSON': (v) => markdownToJson(text(v)),
	'CSV>JSON': (v) => csvToJson(text(v)),
	'JSON>CSV': (v) => jsonToCsv(parseJson(v)),
	'JSON>Text': (v) => text(parseJson(v)) + '\n',
	'JSON>HTML': (v) => markdownToHtml(jsonToMarkdown(parseJson(v))),
	'Markdown>HTML': (v) => markdownToHtml(text(v)),
	'Markdown>Text': (v) => markdownToText(text(v)),
	'HTML>Text': (v) => htmlToText(text(v)),
	'HTML>Markdown': (v) => htmlToMarkdown(text(v)),
	'Text>Markdown': (v) => text(v).trim().split(/\n{2,}/).join('\n\n') + '\n',
	'Text>JSON': (v) => parseJson(v),
	'Text>HTML': (v) => text(v).trim().split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join('\n') + '\n',
	'CSV>Markdown': (v) => jsonToMarkdown(csvToJson(text(v))),
	'CSV>Text': (v) => text(v),
	'Text>CSV': (v) => text(v)
};

/** Converts `input` from one format to another. Same-to-same passes the input through. Throws for a pair there is no converter for. */
export function convert(input: unknown, from: string, to: string): unknown {
	if (from === to) return input;

	const converter = CONVERTERS[`${from}>${to}`];

	if (!converter) throw new Error(`There is no converter from ${from} to ${to}.`);

	return converter(input);
}

export const CONVERSIONS = Object.keys(CONVERTERS).map((k) => k.split('>') as [string, string]);
