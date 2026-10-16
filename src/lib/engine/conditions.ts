// The condition language a branch uses. No eval: a condition is data, `path operator value`.

export const OPERATORS = ['is', 'is not', '>', '>=', '<', '<=', 'contains', 'matches', 'exists'] as const;
export type Operator = (typeof OPERATORS)[number];

export type Condition = { path: string; operator: Operator; value?: string };
export type ConditionSet = { combine: 'all' | 'any'; items: Condition[] };

/** The value at `step-id.some.path`. `trigger` is the run's payload. Unknown anywhere along the way gives `undefined`. */
export function lookup(data: Record<string, unknown>, path: string): unknown {
	const cut = path.indexOf('.');
	const id = cut < 0 ? path : path.slice(0, cut);
	let value: unknown = data[id];

	if (cut < 0) return value;

	for (const key of path.slice(cut + 1).split('.')) {
		if (value === null || typeof value !== 'object') return undefined;
		value = (value as Record<string, unknown>)[Array.isArray(value) && /^\d+$/.test(key) ? Number(key) : key];
	}

	return value;
}

const number = (v: unknown): number | null => {
	if (typeof v === 'number') return Number.isFinite(v) ? v : null;
	if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);

	return null;
};

const same = (a: unknown, b: string | undefined) => {
	const x = number(a);
	const y = number(b);

	if (x !== null && y !== null) return x === y;

	return String(a) === String(b ?? '');
};

/** One condition against the data. A path that leads nowhere is false for everything except `is not` and "does not exist". */
export function check(condition: Condition, data: Record<string, unknown>): boolean {
	const found = lookup(data, condition.path);

	if (condition.operator === 'exists') return found !== undefined && found !== null && (condition.value ?? 'true') !== 'false';
	if (found === undefined) return condition.operator === 'is not';

	switch (condition.operator) {
		case 'is':
			return same(found, condition.value);
		case 'is not':
			return !same(found, condition.value);
		case '>':
		case '>=':
		case '<':
		case '<=': {
			const a = number(found);
			const b = number(condition.value);

			if (a === null || b === null) return false;

			return condition.operator === '>' ? a > b : condition.operator === '>=' ? a >= b : condition.operator === '<' ? a < b : a <= b;
		}
		case 'contains':
			return Array.isArray(found) ? found.some((x) => same(x, condition.value)) : String(found).includes(condition.value ?? '');
		case 'matches':
			try {
				return new RegExp(condition.value ?? '').test(String(found));
			} catch {
				return false;
			}
	}
}

/** Reads what a branch stores in `rules.conditions`: the current shape, or the older list of `{ field, operator, value }`. */
export function parseConditions(text: string | undefined): ConditionSet {
	if (!text) return { combine: 'all', items: [] };

	try {
		const raw = JSON.parse(text) as unknown;

		if (Array.isArray(raw))
			return { combine: 'all', items: raw.map((c: { field?: string; path?: string; operator?: string; value?: string }) => ({ path: c.path ?? c.field ?? '', operator: (c.operator === 'is' || c.operator === 'is not' ? c.operator : (c.operator as Operator)) ?? 'is', value: c.value })) };

		const set = raw as Partial<ConditionSet>;

		return { combine: set.combine === 'any' ? 'any' : 'all', items: Array.isArray(set.items) ? set.items : [] };
	} catch {
		return { combine: 'all', items: [] };
	}
}

export function evaluate(set: ConditionSet, data: Record<string, unknown>): boolean {
	if (!set.items.length) return true;

	return set.combine === 'any' ? set.items.some((c) => check(c, data)) : set.items.every((c) => check(c, data));
}

/** The conditions as one line, for titles and the Markdown export: `jev-classify.score >= 0.5 and …`. */
export function describe(set: ConditionSet): string {
	return set.items.map((c) => `${c.path} ${c.operator}${c.operator === 'exists' ? '' : ` ${c.value ?? ''}`}`.trim()).join(set.combine === 'any' ? ' or ' : ' and ');
}
