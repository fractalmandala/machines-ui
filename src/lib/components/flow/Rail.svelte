<script module lang="ts">
	import './Rail.css';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import { type Screen } from '$lib/stores/app-store.svelte';
	import LogoIcon from '$lib/icons/sidebar/logo.svelte';
	import PlusIcon from '$lib/icons/sidebar/plus.svelte';
	import DashboardIcon from '$lib/icons/sidebar/dashboard.svelte';
	import BoltIcon from '$lib/icons/sidebar/bolt.svelte';
	import DraftsIcon from '$lib/icons/sidebar/drafts.svelte';
	import BarChartIcon from '$lib/icons/sidebar/bar-chart.svelte';
	import MenuBookIcon from '$lib/icons/sidebar/menu-book.svelte';
	import CogIcon from '$lib/icons/sidebar/cog.svelte';
	import RailTooltip from './RailTooltip.svelte';

	const items: {
		label: string;
		Icon: typeof DashboardIcon;
		screen?: Screen;
	}[] = [
		{
			label: 'Dashboard',
			Icon: DashboardIcon,
			screen: 'dashboard'
		},
		{
			label: 'Automations',
			Icon: BoltIcon,
			screen: 'automations'
		},
		{
			label: 'Campaigns',
			Icon: DraftsIcon
		},
		{
			label: 'Analytics',
			Icon: BarChartIcon
		},
		{
			label: 'Docs',
			Icon: MenuBookIcon
		}
	];

	const label =
		'fs-shrink-0 fs-ta-l fl-rail-label';

	const row = 'fs-wfull fs-gap-md fl-rail-row';

	const cell = 'fs-grid fs-shrink-0 fs-center fl-rail-cell';
</script>

<script lang="ts">
	import { app, createAutomation, openAutomation, openScreen } from '$lib/stores/app-store.svelte';

	let { expanded, onNavigate }: { expanded: boolean; onNavigate?: () => void } = $props();

	const screen = $derived(app.screen);

	const automationId = $derived(app.automationId);

	let active = $derived(screen === 'dashboard' ? 0 : 1);
</script>

<nav aria-label="Primary" class="fs-hfull fs-wfull fs-box fs-gap-xl fl-rail">
	<span class="fs-row fs-ycenter fs-gap-md">
		<span class={cell}><LogoIcon aria-label="machines-ui" role="img" class="fl-rail-logo" /></span>
		<span class={`${label} fs-text-white fl-rail-span-3-1`}>machines-ui</span>
	</span>
	<div class="fs-minh0 fs-grow fs-box fl-rail-div">
		<RailTooltip title="New automation" {expanded}>
			{#snippet children(props)}
				<Button
					{...props}
					variant="round"
					size="icon-lg"
					aria-label="Create automation"
					onClick={() => {
						createAutomation();
						onNavigate?.();
					}}
					className={`${row} fl-rail-create-automation-1`}
				>
					<span class={cell}><PlusIcon aria-hidden="true" class="fl-rail-plus-icon" /></span>
					<span class={label}>New automation</span>
				</Button>
			{/snippet}
		</RailTooltip>
		<ul style="--nav-index: {active}" class="fs-relative fs-box fl-rail-ul">
			<span
				aria-hidden="true"
				class="fs-absolute fs-h-md fl-rail-span-6"
			></span>
			{#each items as { label: title, Icon, screen: target }, index (title)}
				<li class="fs-row">
					<RailTooltip {title} {expanded}>
						{#snippet children(props)}
							<Button
								{...props}
								variant="nav"
								size="icon-lg"
								aria-label={title}
								aria-current={active === index ? 'page' : undefined}
								className={row}
								onClick={() => {
									if (target) {
										openScreen(target);
										onNavigate?.();
										return;
									}
									toast('Not available', { class: 'fl-toast-centered' });
								}}
							>
								<span class={cell}><Icon aria-hidden="true" className="fl-rail-icon" /></span>
								<span class={label}>{title}</span>
							</Button>
						{/snippet}
					</RailTooltip>
				</li>
			{/each}
		</ul>
	</div>
	<RailTooltip title="Settings" {expanded}>
		{#snippet children(props)}
			<Button
				{...props}
				variant="ghost"
				size="icon"
				aria-label="Automation settings"
				className={`${row} fl-rail-automation-settings-1`}
				onClick={() => {
					openAutomation(automationId, 'settings');
					onNavigate?.();
				}}
			>
				<span class={cell}>
					<CogIcon
						aria-hidden
						class="fl-rail-cog-icon"
					/>
				</span>
				<span class={`${label} fl-rail-span-10-1`}>Settings</span>
			</Button>
		{/snippet}
	</RailTooltip>
</nav>
