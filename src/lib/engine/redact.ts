const SECRETISH = /(KEY|TOKEN|SECRET|PASSWORD|PASS)/i;

/** The strings to blank out: the host's list, plus every env value whose name looks like a secret. */
export function secretsFrom(env: Record<string, string> = {}, extra: string[] = []): string[] {
	return [...extra, ...Object.entries(env).filter(([k, v]) => SECRETISH.test(k) && v.length >= 4).map(([, v]) => v)].filter((s) => s.length >= 4);
}

/** A copy of `value` with every secret replaced by •••. Works through objects and arrays. */
export function redact<T>(value: T, secrets: string[]): T {
	if (!secrets.length) return value;

	const hide = (text: string) => secrets.reduce((acc, s) => acc.split(s).join('•••'), text);

	const walk = (v: unknown): unknown => {
		if (typeof v === 'string') return hide(v);
		if (Array.isArray(v)) return v.map(walk);
		if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));

		return v;
	};

	return walk(value) as T;
}

/** `${env.NAME}` and `${secret.NAME}` references in a rule, resolved from `env`. Unknown names are left as written. */
export function resolveRefs(text: string, env: Record<string, string>): string {
	return text.replace(/\$\{(?:env|secret)\.([A-Za-z0-9_]+)\}/g, (whole, name: string) => env[name] ?? whole);
}

/** A value cut down to `limit` characters of JSON, for a log line. The full value stays on the step. */
export function clip(value: unknown, limit: number): unknown {
	if (value === undefined) return undefined;

	const text = typeof value === 'string' ? value : JSON.stringify(value);

	if (text === undefined || text.length <= limit) return value;

	return `${text.slice(0, limit)}… (${text.length - limit} more characters)`;
}
