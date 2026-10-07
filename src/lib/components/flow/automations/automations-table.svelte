<script module lang="ts">
	import './automations-table.css';
	import Button from '$lib/components/ui/button.svelte';
	import Tag from '$lib/components/ui/tag.svelte';
	import type { Automation } from '$lib/data/automations.js';
	import { STATUS_LABEL } from '$lib/stores/app-store.svelte';
	import SortIcon from '$lib/icons/automations/sort.svelte';
	import { STATUS_TONE } from '../editor-topbar.svelte';
	import { relativeTime } from './automations-utils.js';
	import Count from './Count.svelte';

	type AutomationsTableProps = {
		automations: Automation[];
		now: number;
		sortedByEdit: boolean;
		descending: boolean;
		onSortByEdit: () => void;
		onOpen: (id: string) => void;
	};

	const columns =
		'fs-grid fl-automations-table-columns';

	const cellDivider =
		'fl-automations-table-cell-divider';
</script>

<script lang="ts">
	let { automations, now, sortedByEdit, descending, onSortByEdit, onOpen }: AutomationsTableProps =
		$props();
</script>

<div
	class="fl-automations-table"
>
	<div class="fl-automations-table-div">
		<div
			role="table"
			aria-label="Automations"
			class="fl-automations-table-table"
		>
			<div role="rowgroup">
				<div role="row" class={`${columns} fl-automations-table-row-1`}>
					{#each ['Automations Name', 'Descriptions', 'Status', 'Runs Started', 'Runs Finished'] as label (label)}
						<span
							role="columnheader"
							class="fs-row fs-ycenter fs-weight-500 fl-automations-table-columnheader"
						>
							{label}
						</span>
					{/each}
					<span
						role="columnheader"
						aria-sort={sortedByEdit ? (descending ? 'descending' : 'ascending') : 'none'}
						class="fs-row fs-ycenter fl-automations-table-columnheader-2"
					>
						<Button
							variant="bare"
							size="bare"
							onClick={onSortByEdit}
							className="fs-row fs-ycenter fs-px-xs fs-weight-500 fl-automations-table-group fl-automations-table-button"
						>
							Last Edited<SortIcon
								aria-hidden
								data-ascending={(sortedByEdit && !descending) || undefined}
								class="fl-automations-table-sort-icon"
							/>
						</Button>
					</span>
				</div>
			</div>
			<div role="rowgroup" class="fs-box fl-automations-table-rowgroup">
				{#each automations as automation (automation.id)}
					{@const edited = relativeTime(automation.updatedAt, now)}
					<div
						role="row"
						tabindex={0}
						onclick={() => onOpen(automation.id)}
						onkeydown={(event) => {
							if (event.key === 'Enter' || event.key === ' ') {
								event.preventDefault();
								onOpen(automation.id);
							}
						}}
						class={`${columns} fl-automations-table-row-2-1`}
					>
						<span role="cell" class="fs-row fs-minw0 fs-ycenter fs-px-bs fl-automations-table-cell">
							<span class="fs-truncate fl-automations-table-span"
								>{automation.name}</span
							>
						</span>
						<span role="cell" class={`fs-row fs-hfull fs-minw0 fs-ycenter fs-px-bs ${cellDivider}`}>
							<span class="fs-truncate fs-weight-400 fl-automations-table-span-2"
								>{automation.description}</span
							>
						</span>
						<span role="cell" class={`fs-row fs-hfull fs-ycenter fs-px-bs ${cellDivider}`}>
							<Tag tone={STATUS_TONE[automation.status]}>{STATUS_LABEL[automation.status]}</Tag>
						</span>
						<span role="cell" class={`fs-row fs-hfull fs-ycenter fs-px-bs ${cellDivider}`}>
							<Count value={automation.started} />
						</span>
						<span role="cell" class={`fs-row fs-hfull fs-ycenter fs-px-bs ${cellDivider}`}>
							<Count value={automation.finished} />
						</span>
						<span role="cell" class={`fs-row fs-hfull fs-ycenter fs-px-bs ${cellDivider}`}>
							<span class="fs-weight-400 fs-text-white fl-automations-table-span-3">
								{#if edited.value}
									<span class="fs-weight-500 fl-automations-table-span-4">{edited.value}</span>
									<span class="fl-automations-table-span-5">{edited.unit}</span>
								{:else}
									<span class="fs-weight-500">{edited.unit}</span>
								{/if}
							</span>
						</span>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
