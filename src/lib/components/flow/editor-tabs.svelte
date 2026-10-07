<script module lang="ts">
	import './editor-tabs.css';
	import SegmentedTabs from '$lib/components/ui/segmented-tabs.svelte';
	import { type EditorTab } from '$lib/stores/app-store.svelte';

	const TABS: {
		value: EditorTab;
		label: string;
	}[] = [
		{
			value: 'overview',
			label: 'Overview'
		},
		{
			value: 'flow',
			label: 'Flow'
		},
		{
			value: 'settings',
			label: 'Settings'
		},
		{
			value: 'export',
			label: 'Export'
		}
	];
</script>

<script lang="ts">
	import { app, setTab } from '$lib/stores/app-store.svelte';

	let { bottom }: { bottom?: boolean } = $props();

	const tab = $derived(app.tab);
</script>

{#if bottom}
	<div class="fs-shrink-0 fs-px-bs fs-py-sm fl-editor-tabs">
		<SegmentedTabs
			label="Automation sections"
			items={TABS}
			value={tab}
			onChange={setTab}
			className="fl-editor-tabs-segmented-tabs"
		/>
	</div>
{:else}
	<div
		class="fs-shrink-0 fs-px-bs fs-py-sm fl-editor-tabs-div"
	>
		<SegmentedTabs label="Automation sections" items={TABS} value={tab} onChange={setTab} />
	</div>
{/if}
