<!--
@component
A framed data table with a rule under the header and an optional footer row for totals.

@example
```svelte
<GraphTable
  title="WHAT THE RESEARCH COST"
  headers={['Agent', 'Tokens', 'Tool calls', 'Time']}
  align={['left', 'right', 'right', 'right']}
  rows={[
    ['Inks and paper', '115,207', '120', '16m'],
    ['Overprint and drift', '135,218', '164', '16m'],
    ['Naming the patterns', '186,716', '112', '18m']
  ]}
  footer={['Total', '437,141', '396', '~50m']}
/>
```
-->

<script module lang="ts">
	import type { Snippet } from 'svelte';

	/** Framed data table with an optional footer row for totals. */
	export type Cell = Snippet | string | number;

	export interface GraphTableProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Column headers, left to right. */
		headers: string[];
		/** Body rows; each cell is a string, number, or snippet. */
		rows: Cell[][];
		/** Optional totals row, one cell per column. */
		footer?: Cell[];
		/** Per-column alignment; defaults to left for the first column and right for the rest. */
		align?: ('left' | 'right')[];
		/** Character drawn at each corner of the frame. */
		corner?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import Frame from '../frame/Frame.svelte';
	import FrameBody from '../frame/FrameBody.svelte';
	import FrameRule from '../frame/FrameRule.svelte';
	import { reveal, stagger } from '../frame/motion.js';

	let {
		title,
		headers,
		rows,
		footer,
		align,
		corner,
		class: className = ''
	}: GraphTableProps = $props();

	function isSnippet(cell: Cell): cell is Snippet {
		return typeof cell === 'function';
	}

	function alignOf(index: number): 'left' | 'right' {
		return align?.[index] ?? (index === 0 ? 'left' : 'right');
	}
</script>

<Frame {title} {corner} class={className}>
	<FrameBody tight>
		<div class="scroll">
			<table class="table">
				<thead>
					<tr>
						{#each headers as header, i (header)}
							<th scope="col" class="cell head" class:right={alignOf(i) === 'right'}>
								{header}
							</th>
						{/each}
					</tr>
					<tr>
						<th class="rulecell" colspan={headers.length}>
							<FrameRule />
						</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as row, r (r)}
						<tr use:reveal={{ delay: stagger(r, 40), amount: 0.4 }}>
							{#each row as cell, c}
								<td class="cell" class:right={alignOf(c) === 'right'}>
									{#if isSnippet(cell)}{@render cell()}{:else}{cell}{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
				{#if footer}
					<tfoot>
						<tr>
							<td class="rulecell pad" colspan={headers.length}>
								<FrameRule />
							</td>
						</tr>
						<tr>
							{#each footer as cell, c}
								<td class="cell foot" class:right={alignOf(c) === 'right'}>
									{#if isSnippet(cell)}{@render cell()}{:else}{cell}{/if}
								</td>
							{/each}
						</tr>
						</tfoot>
					{/if}
			</table>
		</div>
	</FrameBody>
</Frame>

<style>
	.scroll {
		overflow-x: auto;
	}

	.table {
		font-size: 0.875rem;
		width: 100%;
		min-width: 32rem;
		border-collapse: separate;
		border-spacing: 0;
	}

	.cell {
		padding: 0.625rem 0.75rem;
		white-space: nowrap;
		text-align: left;
	}

	.cell.right {
		text-align: right;
	}

	.cell.head {
		padding-bottom: 0.75rem;
		font-weight: 400;
	}

	.cell.foot {
		padding-top: 0.25rem;
	}

	.rulecell {
		padding: 0;
	}

	.rulecell.pad {
		padding-top: 0.5rem;
		padding-bottom: 0.75rem;
	}
</style>
