<script module lang="ts">
	import './overview.css';
	import Button from '$lib/components/ui/button.svelte';
	import SegmentedTabs from '$lib/components/ui/segmented-tabs.svelte';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte';
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte';
	import DropdownMenuRadioGroup from '$lib/components/ui/shadcn/DropdownMenuRadioGroup.svelte';
	import DropdownMenuRadioItem from '$lib/components/ui/shadcn/DropdownMenuRadioItem.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte';
	import CalendarIcon from '$lib/icons/overview/calendar.svelte';
	import OverviewStatCard from './overview-stat-card.svelte';
	import OverviewGrowthChart from './overview-growth-chart.svelte';
	import OverviewTopPosts from './overview-top-posts.svelte';
	import {
		OVERVIEW_TABS,
		RANGES,
		overviewData,
		type OverviewTab,
		type Range
	} from './overview-data.js';

	type OverviewProps = {
		variant: 'dashboard' | 'automation';
		textureSrc: string;
	};
</script>

<script lang="ts">
	import { app } from '$lib/stores/app-store.svelte';

	let { variant, textureSrc }: OverviewProps = $props();

	let tab = $state<OverviewTab>('overview');
	function setTab(value: OverviewTab | ((prev: OverviewTab) => OverviewTab)) {
		tab = typeof value === 'function' ? (value as (prev: OverviewTab) => OverviewTab)(tab) : value;
	}

	let range = $state<Range>('Last 4 Weeks');

	const automation = $derived(app.automations.find((item) => item.id === app.automationId));

	let useDesign = $derived(variant === 'dashboard' || automation?.id === 'jev');

	let seed = $derived(useDesign ? 'design' : (automation?.id ?? 'design'));

	let reach = $derived(useDesign ? 0 : (automation?.started ?? 0));

	let { stats, chart } = $derived(overviewData(tab, range, seed, reach));

	let title = $derived(variant === 'dashboard' ? 'Hey hey 👋' : (automation?.name ?? 'Overview'));

	let description = $derived(
		variant === 'dashboard'
			? "Here's a quick snapshot of how your automations are performing."
			: "Here's a quick snapshot of how this automation is performing."
	);
</script>

<div class="fs-minh0 fs-grow fl-overview">
	<div
		class="fs-box fs-pt-xl fl-overview-div"
	>
		<div class="fs-box fl-overview-div-2">
			<div class="fs-box fl-overview-div-3">
				<span role="heading" aria-level={1} class="fs-weight-600 fs-text-white fl-overview-heading"
					>{title}</span
				>
				<span class="fs-weight-400 fl-overview-span">{description}</span>
			</div>
			<div class="fs-row fs-wrap fs-ycenter fs-xbetween fs-gap-md">
				<SegmentedTabs
					label="Overview sections"
					items={OVERVIEW_TABS}
					value={tab}
					onChange={setTab}
					className="fl-overview-segmented-tabs"
				/>
				<DropdownMenu>
					<DropdownMenuTrigger>
						{#snippet child({ props })}
							<Button {...props} variant="field" size="field" className="fl-overview-button">
								<CalendarIcon aria-hidden class="fl-overview-calendar-icon" />
								<span class="fs-pr-xs">{range}</span>
							</Button>
						{/snippet}
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="fl-overview-dropdown-menu-conten">
						<DropdownMenuRadioGroup
							value={range}
							onValueChange={(value) => (range = value as Range)}
						>
							{#each RANGES as option (option)}
								<DropdownMenuRadioItem value={option}>{option}</DropdownMenuRadioItem>
							{/each}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
		<div class="fs-box fl-overview-div-5">
			<div
				class="fs-grid fs-gap-bs fl-overview-div-6"
			>
				{#each stats as stat (`${tab}-${stat.label}`)}
					<OverviewStatCard {stat} {textureSrc} />
				{/each}
			</div>
			<div
				class="fs-grid fs-gap-bs fl-overview-div-7"
			>
				<OverviewGrowthChart data={chart} animationKey={`${seed}-${tab}-${range}`} />
				<OverviewTopPosts {seed} />
			</div>
		</div>
	</div>
</div>
