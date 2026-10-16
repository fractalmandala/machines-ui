// A small JSON Schema checker: enough for "does this output have the shape I said it would".
// Supports type, enum, required, properties, items, minimum, maximum, minLength, maxLength, minItems.

type Schema = { type?: string | string[]; enum?: unknown[]; required?: string[]; properties?: Record<string, Schema>; items?: Schema; minimum?: number; maximum?: number; minLength?: number; maxLength?: number; minItems?: number };

const kind = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);

/** The problems with `value` against `schema`, each as `path: message`. Empty means it fits. */
export function checkSchema(value: unknown, schema: Schema, path = '$'): string[] {
	const out: string[] = [];
	const k = kind(value);
	const types = schema.type === undefined ? null : Array.isArray(schema.type) ? schema.type : [schema.type];

	if (types && !types.some((t) => t === k || (t === 'number' && k === 'integer'))) return [`${path}: expected ${types.join(' or ')}, got ${k}`];
	if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) out.push(`${path}: must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
	if (typeof value === 'number') {
		if (schema.minimum !== undefined && value < schema.minimum) out.push(`${path}: must be at least ${schema.minimum}`);
		if (schema.maximum !== undefined && value > schema.maximum) out.push(`${path}: must be at most ${schema.maximum}`);
	}
	if (typeof value === 'string') {
		if (schema.minLength !== undefined && value.length < schema.minLength) out.push(`${path}: must be at least ${schema.minLength} characters`);
		if (schema.maxLength !== undefined && value.length > schema.maxLength) out.push(`${path}: must be at most ${schema.maxLength} characters`);
	}
	if (Array.isArray(value)) {
		if (schema.minItems !== undefined && value.length < schema.minItems) out.push(`${path}: must have at least ${schema.minItems} items`);
		if (schema.items) value.forEach((v, i) => out.push(...checkSchema(v, schema.items!, `${path}[${i}]`)));
	}
	if (value && typeof value === 'object' && !Array.isArray(value)) {
		for (const key of schema.required ?? []) if (!(key in (value as object))) out.push(`${path}.${key}: is required`);
		for (const [key, sub] of Object.entries(schema.properties ?? {})) if (key in (value as object)) out.push(...checkSchema((value as Record<string, unknown>)[key], sub, `${path}.${key}`));
	}

	return out;
}
