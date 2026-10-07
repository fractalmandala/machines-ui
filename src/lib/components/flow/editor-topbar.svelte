<script module lang="ts">
	import './editor-topbar.css';
	import Button from '$lib/components/ui/button.svelte';
	import Tag, { type TagTone } from '$lib/components/ui/tag.svelte';
	import { STATUS_LABEL, type EditorTab } from '$lib/stores/app-store.svelte';
	import type { AutomationStatus } from '$lib/data/automations.js';
	import ToolbarIcon from '$lib/icons/topbar/toolbar.svelte';
	import ChevronIcon from '$lib/icons/topbar/chevron.svelte';
	import SearchIcon from '$lib/icons/topbar/search.svelte';
	import PlusIcon from '$lib/icons/sidebar/plus.svelte';
	import EditorTitle from './editor-title.svelte';
	import AccountActions from './AccountActions.svelte';
	import MobileMenu from './MobileMenu.svelte';
	import FlowActions from './FlowActions.svelte';

	export const STATUS_TONE: Record<AutomationStatus, TagTone> = {
		draft: 'violet',
		running: 'green',
		paused: 'red'
	};

	const TAB_LABEL: Record<EditorTab, string> = {
		overview: 'Overview',
		flow: 'Flow',
		settings: 'Settings',
		export: 'Export'
	};

	type EditorTopbarProps = {
		avatarSrc: string;
	};
</script>

<script lang="ts">
	import { app, createAutomation, openScreen, toggleSidebar } from '$lib/stores/app-store.svelte';

	let { avatarSrc }: EditorTopbarProps = $props();

	const screen = $derived(app.screen);

	const tab = $derived(app.tab);

	const automations = $derived(app.automations);

	const automation = $derived(app.automations.find((item) => item.id === app.automationId));

	const sidebarOpen = $derived(app.sidebarOpen);
</script>

<header class="fs-relative fs-row fs-shrink-0 fs-ycenter fs-xbetween fs-gap-bs fs-pad-bs fl-editor-topbar">
	<div class="fs-row fs-minw0 fs-ycenter fs-gap-bs">
		<Button
			variant="ghost"
			size="icon"
			aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
			aria-pressed={sidebarOpen}
			onClick={toggleSidebar}
		>
			<ToolbarIcon
				aria-hidden
				class="fl-editor-topbar-toolbar-icon"
			/>
		</Button>
		{#if screen === 'dashboard'}
			<span class="fs-text-white fl-editor-topbar-span">Dashboard</span>
		{/if}
		{#if screen === 'automations'}
			<div class="fs-row fs-ycenter fs-gap-md">
				<span class="fs-text-white fl-editor-topbar-span-2">Automations</span>
				<Tag tone="violet" className="fl-editor-topbar-tag">{automations.length} total</Tag>
			</div>
		{/if}
		{#if screen === 'editor' && automation}
			<div class="fs-row fs-minw0 fs-ycenter fs-gap-md">
				<nav aria-label="Breadcrumb" class="fs-minw0">
					<ol class="fs-row fs-ycenter fl-editor-topbar-ol">
						<li class="fl-editor-topbar-li">
							<Button variant="crumb" size="crumb" onClick={() => openScreen('automations')}
								>Automations</Button
							>
						</li>
						<li aria-hidden="true" class="fl-editor-topbar-li-2">
							<ChevronIcon class="fl-editor-topbar-chevron-icon" />
						</li>
						<li aria-current="page" class="fs-truncate fs-text-white fl-editor-topbar-li-3">{TAB_LABEL[tab]}</li>
					</ol>
				</nav>
				<Tag tone={STATUS_TONE[automation.status]} className="fl-editor-topbar-tag-2">
					{STATUS_LABEL[automation.status]}
				</Tag>
			</div>
		{/if}
	</div>
	{#if screen === 'editor'}
		<EditorTitle />
	{/if}
	<div class="fs-row fs-shrink-0 fs-ycenter fs-gap-md">
		{#if screen === 'dashboard'}
			<Button
				variant="field"
				size="field"
				className="fl-editor-topbar-button"
				onClick={() => openScreen('automations')}
			>
				<SearchIcon aria-hidden class="fl-editor-topbar-search-icon" />
				<span class="fs-pr-xs">Search automations</span>
			</Button>
			<Button variant="accent" size="field" className="fs-pl-sm" onClick={createAutomation}>
				<span class="fs-row fs-ycenter fs-xcenter fl-editor-topbar-span-4"
					><PlusIcon aria-hidden class="fl-editor-topbar-plus-icon" /></span
				>
				<span class="fs-pr-xs">New automation</span>
			</Button>
		{/if}
		{#if screen === 'automations'}
			<AccountActions {avatarSrc} />
		{/if}
		{#if screen === 'editor'}
			<MobileMenu />
		{/if}
		{#if screen === 'editor'}
			{#if tab === 'flow'}
				<FlowActions />
			{:else}
				<AccountActions {avatarSrc} />
			{/if}
		{/if}
	</div>
</header>
