/**
 * Merge class strings. The styling layer adds classes via component props;
 * this keeps a single insertion point for future base classes.
 *
 * Accepts anything (bits-ui types `class` as clsx-style ClassValue), but
 * only string values are joined.
 */
export function mergeClass(...parts: unknown[]): string {
	return parts
		.filter((part): part is string => typeof part === 'string' && part.length > 0)
		.join(' ');
}
