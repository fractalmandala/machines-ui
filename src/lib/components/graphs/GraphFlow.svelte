<!--
@component
One or more rows of labelled nodes joined by arrows, with an accent path for the live branch and
muted nodes for what trails it.

@example
```svelte
<script lang="ts">
	import { GraphFlow, type GraphFlowRow } from '@fractaldesign/machines-ui';

	const rows: GraphFlowRow[] = [
	  { nodes: [{ label: 'tap' }, { label: 'server' }, { label: 'update' }] },
	  {
	    nodes: [
	      { label: 'tap' },
	      { label: 'update', tone: 'accent' },
	      { label: 'server syncs', stretch: true, tone: 'muted' }
	    ]
	  }
	];
</script>

<GraphFlow title="OPTIMISTIC UI" {rows} />
```
-->

<script module lang="ts">
	import type { GraphPalette } from '../frame/tone.js';

	/** Tone of a flow node: default foreground, accent (live path), or muted. */
	export type GraphFlowTone = 'default' | 'accent' | 'muted';

	export interface GraphFlowNode {
		/** Text shown in the node. */
		label: string;
		/** Node colour: default foreground, accent for the live path, muted for a trailing node. */
		tone?: GraphFlowTone;
		/** Let the node stretch to fill the remaining row width. */
		stretch?: boolean;
	}

	export interface GraphFlowRow {
		/** Nodes in this row, in order. */
		nodes: GraphFlowNode[];
	}

	export interface GraphFlowProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Flow rows, top to bottom; each row is a sequence of nodes. */
		rows: GraphFlowRow[];
		/** How many accent colours the graph uses: `mono` one, `duo` two, `multi` three. */
		palette?: GraphPalette;
		/** Character drawn at each corner of the frame. */
		corner?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import Frame from '../frame/Frame.svelte';
	import FrameBody from '../frame/FrameBody.svelte';
	import GraphArrow from '../frame/GraphArrow.svelte';
	import { reveal, stagger } from '../frame/motion.js';
	import { toneRole, type ToneRole } from '../frame/tone.js';

	let {
		title,
		rows,
		palette,
		corner,
		class: className = ''
	}: GraphFlowProps = $props();

	function nodeRole(tone: GraphFlowTone): ToneRole {
		if (tone === 'accent') {
			return toneRole(palette, 'primary');
		}

		if (tone === 'muted') {
			return toneRole(palette, 'secondary');
		}

		return 'foreground';
	}
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="flow">
			{#each rows as row, rowIndex (rowIndex)}
				<div class="row" use:reveal={{ delay: stagger(rowIndex, 80), amount: 0.5 }}>
					{#each row.nodes as node, nodeIndex (`${node.label}-${nodeIndex}`)}
						{@const tone = node.tone ?? 'default'}
						{@const role = nodeRole(tone)}
						<div class="node" class:stretch={node.stretch}>
							{#if nodeIndex > 0}
								<GraphArrow accent={tone === 'accent'} stretch={node.stretch} />
							{/if}
							<span
								class="label"
								class:c-accent={role === 'accent'}
								class:c-accent2={role === 'accent2'}
								class:c-muted={role === 'muted'}
								class:c-fg={role === 'foreground'}
							>
								{node.label}
							</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	</FrameBody>
</Frame>

<style>
	.flow {
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	.row {
		display: flex;
		min-width: 0;
		flex-wrap: wrap;
		align-items: center;
		column-gap: 0.75rem;
		row-gap: 0.5rem;
	}

	@media (min-width: 640px) {
		.row {
			flex-wrap: nowrap;
		}
	}

	.node {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 0.75rem;
	}

	.node.stretch {
		min-width: 4rem;
		flex: 1;
	}

	.label {
		flex-shrink: 0;
		white-space: nowrap;
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.c-accent2 {
		color: var(--graph-accent-2, oklch(0.78 0.12 70));
	}

	.c-muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.c-fg {
		color: var(--text-primary, oklch(0.93 0 0));
	}
</style>
