<script module lang="ts">
	import './automations-filter-sheet.css';
	import Button from '$lib/components/ui/button.svelte';
	import Divider from '$lib/components/ui/divider.svelte';
	import Dialog from '$lib/components/ui/shadcn/dialog.svelte';
	import DialogClose from '$lib/components/ui/shadcn/DialogClose.svelte';
	import DialogContent from '$lib/components/ui/shadcn/DialogContent.svelte';
	import DialogTitle from '$lib/components/ui/shadcn/DialogTitle.svelte';
	import Switch from '$lib/components/ui/shadcn/switch.svelte';
	import { STATUS_LABEL } from '$lib/stores/app-store.svelte';
	import CloseIcon from '$lib/icons/flow/zoom-in.svelte';
	import { CATEGORIES, SORTS, STATUSES, type Filters } from './automations-utils.js';
	import Group from './Group.svelte';

	type AutomationsFilterSheetProps = {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		filters: Filters;
		resultCount: number;
		onChange: (patch: Partial<Filters>) => void;
		onReset: () => void;
	};

	const chip =
		'fs-px-md fl-automations-filter-sheet-chip';
</script>

<script lang="ts">
	let { open, onOpenChange, filters, resultCount, onChange, onReset }: AutomationsFilterSheetProps =
		$props();
</script>

<Dialog {open} {onOpenChange}>
	<DialogContent variant="sheet" aria-describedby={undefined}>
		<span aria-hidden="true" class="fs-shrink-0 fs-radius-full fl-automations-filter-sheet"></span>
		<div class="fs-row fs-shrink-0 fs-ycenter fs-xbetween fs-gap-md fs-pt-sm fs-pb-md fl-automations-filter-sheet-div">
			<DialogTitle>Filters</DialogTitle>
			<DialogClose>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" aria-label="Close filters">
						<CloseIcon
							aria-hidden
							class="fl-automations-filter-sheet-close-icon"
						/>
					</Button>
				{/snippet}
			</DialogClose>
		</div>
		<Divider />
		<div class="fs-minh0 fs-box fs-gap-lg fl-automations-filter-sheet-div-2">
			<Group title="Sort by">
				{#each SORTS as sort (sort)}
					<Button
						variant="field"
						size="field"
						aria-pressed={filters.sort === sort}
						className={chip}
						onClick={() => onChange({ sort })}
					>
						{sort.charAt(0).toUpperCase() + sort.slice(1)}
					</Button>
				{/each}
			</Group>
			<label
				for="filters-reverse"
				class="fs-row fs-ycenter fs-xbetween fs-gap-lg fs-px-bs fs-py-md fl-automations-filter-sheet-label"
			>
				<span class="fs-box">
					<span class="fs-text-white fl-automations-filter-sheet-span-2">Oldest first</span>
					<span class="fl-automations-filter-sheet-span-3">Flip the order of the list.</span>
				</span>
				<Switch
					id="filters-reverse"
					checked={!filters.descending}
					onCheckedChange={(checked) => onChange({ descending: !checked })}
				/>
			</label>
			<Group title="Category">
				{#each CATEGORIES as item (item.value)}
					<Button
						variant="field"
						size="field"
						aria-pressed={filters.category === item.value}
						className={chip}
						onClick={() => onChange({ category: item.value })}
					>
						{item.label}
					</Button>
				{/each}
			</Group>
			<Group title="Status">
				{#each STATUSES as status (status)}
					{@const active = filters.statuses.includes(status)}
					<Button
						variant="field"
						size="field"
						aria-pressed={active}
						className={chip}
						onClick={() =>
							onChange({
								statuses: active
									? filters.statuses.filter((item) => item !== status)
									: [...filters.statuses, status]
							})}
					>
						{STATUS_LABEL[status]}
					</Button>
				{/each}
			</Group>
		</div>
		<Divider />
		<div
			class="fs-row fs-shrink-0 fs-ycenter fs-gap-md fs-pt-md fl-automations-filter-sheet-div-3"
		>
			<Button variant="field" size="field" className="fs-px-bs fl-automations-filter-sheet-button-4" onClick={onReset}>Reset</Button>
			<DialogClose>
				{#snippet child({ props })}
					<Button {...props} variant="accent" size="field" className="fs-grow fl-automations-filter-sheet-button-5">
						Show {resultCount}
						{resultCount === 1 ? 'automation' : 'automations'}
					</Button>
				{/snippet}
			</DialogClose>
		</div>
	</DialogContent>
</Dialog>
