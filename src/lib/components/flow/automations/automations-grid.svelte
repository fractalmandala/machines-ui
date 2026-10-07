<script module lang="ts">
	import './automations-grid.css';
	import Button from '$lib/components/ui/button.svelte';
	import Tag from '$lib/components/ui/tag.svelte';
	import type { Automation } from '$lib/data/automations.js';
	import { STATUS_LABEL } from '$lib/stores/app-store.svelte';
	import { STATUS_TONE } from '../editor-topbar.svelte';
	import { ACTIONS } from '../canvas/flow-actions.js';
	import { relativeTime } from './automations-utils.js';

	type AutomationsGridProps = {
		automations: Automation[];
		now: number;
		onOpen: (id: string) => void;
	};
</script>

<script lang="ts">
	import { exportGraph } from '$lib/stores/flow-store.svelte';

	let { automations, now, onOpen }: AutomationsGridProps = $props();
</script>

<ul class="fs-grid fs-gap-bs fl-automations-grid">
	{#each automations as automation, index (automation.id)}
		{@const graph = exportGraph(automation.id)}
		{@const steps = graph.nodes.toSorted((a, b) => a.y - b.y || a.x - b.x)}
		{@const edited = relativeTime(automation.updatedAt, now)}
		<li
			style="--delay: {`${Math.min(index, 8) * 40}ms`}"
			class="fl-automations-grid-li"
		>
			<Button
				variant="bare"
				size="bare"
				onClick={() => onOpen(automation.id)}
				className="fs-relative fs-hfull fs-wfull fs-box fs-gap-bs fs-ta-l fl-automations-grid-group fl-automations-grid-button"
			>
				<span class="fs-row fs-ytop fs-xbetween fs-gap-md">
					<span class="fs-text-white fl-automations-grid-span-2">{automation.name}</span>
					<Tag tone={STATUS_TONE[automation.status]}>{STATUS_LABEL[automation.status]}</Tag>
				</span>
				<span class="fs-weight-400 fl-automations-grid-span-3">
					{automation.description}
				</span>
				<span class="fs-row fs-wrap fs-ycenter fs-gap-xs" aria-label={`${steps.length} steps`}>
					{#each steps.slice(0, 6) as step (step.id)}
						{@const action = ACTIONS[step.kind]}
						<span
							title={step.title}
							class={`${action.theme} fs-row fs-ycenter fs-xcenter fl-automations-grid-span-5-1`}
						>
							<action.Icon aria-hidden className="fl-automations-grid-action-icon" />
						</span>
					{/each}
					{#if steps.length > 6}
						<span
							class="fs-row fs-ycenter fs-px-sm fl-automations-grid-span-6"
						>
							+{steps.length - 6}
						</span>
					{/if}
				</span>
				<span
					class="fs-row fs-ycenter fs-xbetween fs-gap-md fl-automations-grid-span-7"
				>
					<span class="fs-minw0 fs-truncate">
						<span class="fs-text-white fl-automations-grid-span-9">{automation.started}</span> started ·
						<span class="fs-text-white fl-automations-grid-span-10">{automation.finished}</span> completed
					</span>
					<span class="fs-shrink-0"
						>{edited.value ? `${edited.value} ${edited.unit}` : edited.unit}</span
					>
				</span>
			</Button>
		</li>
	{/each}
</ul>
