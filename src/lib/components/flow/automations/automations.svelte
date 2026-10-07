<script module lang="ts">
	import './automations.css';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import IconBadge from '$lib/components/ui/icon-badge.svelte';
	import { useCompact } from '$lib/utils/use-compact.js';
	import BoltIcon from '$lib/icons/automations/bolt.svelte';
	import AutomationsToolbar from './automations-toolbar.svelte';
	import AutomationsTable from './automations-table.svelte';
	import AutomationsGrid from './automations-grid.svelte';
	import { applyFilters, type Filters } from './automations-utils.js';
	import { useNow } from './use-now.svelte';

	const INITIAL_FILTERS: Filters = {
		sort: 'creation date',
		descending: true,
		category: 'all',
		statuses: [],
		query: ''
	};
</script>

<script lang="ts">
	import { app, createAutomation, openAutomation } from '$lib/stores/app-store.svelte';

	const automations = $derived(app.automations);

	let filters = $state(INITIAL_FILTERS);

	const compactState = useCompact();

	let viewOverride = $state<'table' | 'grid' | null>(null);

	let view = $derived(viewOverride ?? (compactState.matches ? 'grid' : 'table'));

	const nowState = useNow();
	let now = $derived(nowState.value);

	let visible = $derived(applyFilters(automations, filters));

	const update = (patch: Partial<Filters>) =>
		(filters = {
			...filters,
			...patch
		});
</script>

<div class="fs-minh0 fs-grow fl-automations">
	<div class="fs-box fl-automations-div">
		<div class="fs-box fs-gap-md">
			<IconBadge><BoltIcon class="fs-text-white fl-automations-bolt-icon" /></IconBadge>
			<div class="fs-box fl-automations-div-3">
				<span role="heading" aria-level={1} class="fs-weight-600 fs-text-white fl-automations-heading">
					Automations
				</span>
				<span class="fs-weight-400 fl-automations-span">
					Craft seamless automated journeys for your team. Need help getting
					started?
					<Button
						variant="bare"
						size="bare"
						className="fs-weight-500 fl-automations-button"
						onClick={() =>
							toast('Tutorial: Your first automation', {
								description: '4 min video · Build a welcome series from scratch.'
							})}
					>
						Watch the tutorial
					</Button>
				</span>
			</div>
		</div>
		<div class="fs-box fl-automations-div-4">
			<AutomationsToolbar
				{filters}
				{view}
				onChange={update}
				onToggleView={() => (viewOverride = viewOverride === 'table' ? 'grid' : 'table')}
				onCreate={createAutomation}
				onReset={() => (filters = { ...INITIAL_FILTERS, query: filters.query })}
				resultCount={visible.length}
			/>
			<div class="fs-box fl-automations-div-5">
				{#if visible.length === 0}
					<div
						class="fs-box fs-gap-md fs-px-lg fs-py-3xl fs-ta-c fl-automations-div-6"
					>
						<span class="fs-text-white fl-automations-span-2">No automations match</span>
						<span class="fs-weight-400 fl-automations-span-3">
							Try a different search or clear the filters.
						</span>
						<Button
							variant="field"
							size="field"
							className="fs-px-md"
							onClick={() => (filters = INITIAL_FILTERS)}
						>
							Clear filters
						</Button>
					</div>
				{:else if view === 'table'}
					<AutomationsTable
						automations={visible}
						{now}
						sortedByEdit={filters.sort === 'last edited'}
						descending={filters.descending}
						onSortByEdit={() =>
							update({
								sort: 'last edited',
								descending: filters.sort === 'last edited' ? !filters.descending : true
							})}
						onOpen={(id) => openAutomation(id)}
					/>
				{:else}
					<AutomationsGrid automations={visible} {now} onOpen={(id) => openAutomation(id)} />
				{/if}
				<span class="fs-weight-500 fs-text-white fl-automations-span-4">
					Showing <span class="fl-automations-span-5">{visible.length}</span>
					<span class="fl-automations-span-6">
						of {automations.length}
						{automations.length === 1 ? 'item' : 'items'}
					</span>
				</span>
			</div>
		</div>
	</div>
</div>
