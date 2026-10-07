<!-- @component
The flow editor shell without a wrapping section: sidebar, top bar, tabs and the active screen (flow canvas, automations, overview, settings, export). Renders at the size of its container. 
@example
```svelte
<EditorApp
  avatarSrc="/assets/images/_common/avatar.svg"
  textureSrc="/assets/images/home/editor/overview/card-texture.avif"
/>
```
-->

<script module lang="ts">
	import './editor-app.css';
	import Toaster from '$lib/components/ui/shadcn/sonner.svelte';
	import { Provider as TooltipProvider } from '$lib/components/ui/shadcn/tooltip/index.js';
	import EditorSidebar from './editor-sidebar.svelte';	
	import EditorTopbar from './editor-topbar.svelte';
	import EditorTabs from './editor-tabs.svelte';
	import FlowCanvas from './canvas/flow-canvas.svelte';
	import Automations from './automations/automations.svelte';
	import Overview from './overview/overview.svelte';
	import Settings from './settings/settings.svelte';
	import Export from './export/export.svelte';

	type EditorAppProps = {
		/** Image URL for the account avatar in the top bar. */
		avatarSrc: string;
		/** Image URL for the card texture on the overview screen. */
		textureSrc: string;
	};

	const divider =
		'fs-shrink-0 fl-editor-app-divider';
</script>

<script lang="ts">
	import { app } from '$lib/stores/app-store.svelte';

	let { avatarSrc, textureSrc }: EditorAppProps = $props();

	const screen = $derived(app.screen);

	const tab = $derived(app.tab);

	const automationId = $derived(app.automationId);

	const automationName = $derived(
		app.automations.find((item) => item.id === app.automationId)?.name
	);

	$effect(() => {
		if (!automationName) return;
		document.title = `Flow - ${automationName}`;
	});
</script>

<TooltipProvider>
	<EditorSidebar />
	<div class="fs-hfull fs-row fs-minw0 fs-grow fl-editor-app">
		<div
			class="fs-hfull fs-relative fs-minw0 fs-grow fs-box fl-editor-app-div"
		>
			<EditorTopbar {avatarSrc} />
			<div aria-hidden="true" class={divider}></div>
			{#if screen === 'editor'}
				<EditorTabs />
				<div aria-hidden="true" class={`${divider} fl-editor-app-div-3-1`}></div>
				{#if tab === 'flow'}
					<FlowCanvas />
				{/if}
				{#if tab === 'overview'}
					<Overview variant="automation" {textureSrc} />
				{/if}
				{#if tab === 'settings'}
					<Settings />
				{/if}
				{#if tab === 'export'}
					<Export />
				{/if}
				<div aria-hidden="true" class={`${divider} fl-editor-app-div-4-1`}></div>
				<EditorTabs bottom />
			{/if}
			{#if screen === 'automations'}
				<Automations />
			{/if}
			{#if screen === 'dashboard'}
				<Overview variant="dashboard" {textureSrc} />
			{/if}
			<div
				class="fs-absolute fl-editor-app-div-5"
			></div>
		</div>
	</div>
	<Toaster />
</TooltipProvider>
