<script module lang="ts">
	import './automations-toolbar.css';
	import Button from '$lib/components/ui/button.svelte';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte';
	import DropdownMenuCheckboxItem from '$lib/components/ui/shadcn/DropdownMenuCheckboxItem.svelte';
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte';
	import DropdownMenuLabel from '$lib/components/ui/shadcn/DropdownMenuLabel.svelte';
	import DropdownMenuRadioGroup from '$lib/components/ui/shadcn/DropdownMenuRadioGroup.svelte';
	import DropdownMenuRadioItem from '$lib/components/ui/shadcn/DropdownMenuRadioItem.svelte';
	import DropdownMenuSeparator from '$lib/components/ui/shadcn/DropdownMenuSeparator.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte';
	import { STATUS_LABEL } from '$lib/stores/app-store.svelte';
	import SortIcon from '$lib/icons/automations/sort.svelte';
	import FilterIcon from '$lib/icons/automations/filter.svelte';
	import CircleDotIcon from '$lib/icons/automations/circle-dot.svelte';
	import LayoutBoardIcon from '$lib/icons/automations/layout-board.svelte';
	import PlusIcon from '$lib/icons/sidebar/plus.svelte';
	import { CATEGORIES, SORTS, STATUSES, type Filters, type Sort } from './automations-utils.js';
	import AutomationsFilterSheet from './automations-filter-sheet.svelte';
	import SearchField from './SearchField.svelte';

	type AutomationsToolbarProps = {
		filters: Filters;
		view: 'table' | 'grid';
		onChange: (patch: Partial<Filters>) => void;
		onToggleView: () => void;
		onCreate: () => void;
		onReset: () => void;
		resultCount: number;
	};
</script>

<script lang="ts">
	import { resolveState, type StateInput } from '$lib/utils/utils.js';
	let {
		filters,
		view,
		onChange,
		onToggleView,
		onCreate,
		onReset,
		resultCount
	}: AutomationsToolbarProps = $props();

	let category = $derived(CATEGORIES.find((item) => item.value === filters.category)!);

	let sheetOpen = $state(false);
	function setSheetOpen(value: StateInput<boolean>) {
		sheetOpen = resolveState(sheetOpen, value);
	}

	let activeFilters = $derived(
		Number(filters.sort !== 'creation date' || !filters.descending) +
			Number(filters.category !== 'all') +
			filters.statuses.length
	);
</script>

<div class="fs-box fl-automations-toolbar">
	<SearchField
		large
		value={filters.query}
		onChange={(query) => onChange({ query })}
		className="fs-wfull"
	/>
	<div class="fs-grid fl-automations-toolbar-div">
		<Button
			variant="field"
			size="field"
			className="fs-gap-sm fs-px-md fl-automations-toolbar-button"
			onClick={() => (sheetOpen = true)}
		>
			<FilterIcon aria-hidden class="fl-automations-toolbar-filter-icon" />
			<span>Filters</span>
			{#if activeFilters > 0}
				<span
					class="fs-row fs-h-md fs-ycenter fs-xcenter fs-radius-full fs-weight-600 fs-text-white fl-automations-toolbar-span"
				>
					{activeFilters}
				</span>
			{/if}
		</Button>
		<Button variant="accent" size="field" className="fs-gap-sm fs-px-md fl-automations-toolbar-button-2" onClick={onCreate}>
			<PlusIcon aria-hidden class="fl-automations-toolbar-plus-icon" />
			<span>Create New</span>
		</Button>
	</div>
	<AutomationsFilterSheet
		open={sheetOpen}
		onOpenChange={setSheetOpen}
		{filters}
		{resultCount}
		{onChange}
		{onReset}
	/>
</div>
<div class="fs-wrap fs-gap-md fl-automations-toolbar-div-2">
	<div class="fs-row fs-wrap fs-ycenter fs-gap-md">
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="field" size="field">
						<SortIcon aria-hidden class="fl-automations-toolbar-sort-icon" />
						<span class="fs-pr-xs">
							<span class="fl-automations-toolbar-span-3">Sorted by</span>
							<span class="fs-weight-600 fs-text-white">{filters.sort}</span>
						</span>
					</Button>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="fl-automations-toolbar-dropdown-menu-conten">
				<DropdownMenuLabel>Sort automations by</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={filters.sort}
					onValueChange={(sort) => onChange({ sort: sort as Sort, descending: true })}
				>
					{#each SORTS as sort (sort)}
						<DropdownMenuRadioItem value={sort} className="fs-tt-c">{sort}</DropdownMenuRadioItem
						>
					{/each}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem
					checked={!filters.descending}
					onCheckedChange={(checked) => onChange({ descending: !checked })}
				>
					Reverse order
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="field" size="field">
						<FilterIcon aria-hidden class="fl-automations-toolbar-filter-icon-2" />
						<span class="fs-pr-xs">{category.label}</span>
					</Button>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="fl-automations-toolbar-dropdown-menu-conten-2">
				<DropdownMenuRadioGroup
					value={filters.category}
					onValueChange={(value) => onChange({ category: value as Filters['category'] })}
				>
					{#each CATEGORIES as item (item.value)}
						<DropdownMenuRadioItem value={item.value}>{item.label}</DropdownMenuRadioItem>
					{/each}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="field" size="field">
						<CircleDotIcon aria-hidden class="fl-automations-toolbar-circle-dot-icon" />
						<span class="fs-pr-xs">
							Status
							{#if filters.statuses.length > 0}
								<span class="fl-automations-toolbar-span-7">· {filters.statuses.length}</span>
							{/if}
						</span>
					</Button>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="fl-automations-toolbar-dropdown-menu-conten-3">
				{#each STATUSES as status (status)}
					<DropdownMenuCheckboxItem
						checked={filters.statuses.includes(status)}
						onSelect={(event) => event.preventDefault()}
						onCheckedChange={(checked) =>
							onChange({
								statuses: checked
									? [...filters.statuses, status]
									: filters.statuses.filter((item) => item !== status)
							})}
					>
						{STATUS_LABEL[status]}
					</DropdownMenuCheckboxItem>
				{/each}
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
	<div class="fs-row fs-ycenter fs-gap-md">
		<SearchField
			value={filters.query}
			onChange={(query) => onChange({ query })}
			className="fl-automations-toolbar-search-field-2"
		/>
		<Button
			variant="brick"
			size="icon-lg"
			aria-label={view === 'table' ? 'Show as cards' : 'Show as table'}
			aria-pressed={view === 'grid'}
			onClick={onToggleView}
			className="fl-automations-toolbar-button-3"
		>
			<LayoutBoardIcon
				aria-hidden
				class="fl-automations-toolbar-layout-board-icon"
			/>
		</Button>
		<Button variant="accent" size="field" className="fs-pl-sm" onClick={onCreate}>
			<span class="fs-row fs-ycenter fs-xcenter fl-automations-toolbar-span-8">
				<PlusIcon aria-hidden class="fl-automations-toolbar-plus-icon-2" />
			</span>
			<span class="fs-pr-xs">Create New</span>
		</Button>
	</div>
</div>
