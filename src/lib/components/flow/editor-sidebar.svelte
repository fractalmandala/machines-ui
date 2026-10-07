<script module lang="ts">
	import './editor-sidebar.css';
	import Rail from './Rail.svelte';

</script>

<script lang="ts">
	import { app, toggleSidebar } from '$lib/stores/app-store.svelte';

	const sidebarOpen = $derived(app.sidebarOpen);
</script>

<div
	data-open={sidebarOpen || undefined}
	class="fs-shrink-0 fl-editor-sidebar-group-rail fl-editor-sidebar"
>
	<Rail expanded={sidebarOpen} />
</div>
{#if sidebarOpen}
	<div class="fl-editor-sidebar-div">
		<button
			type="button"
			aria-label="Close sidebar"
			onclick={toggleSidebar}
			class="fs-fixed fl-editor-sidebar-close-sidebar"
		></button>
		<div
			data-open
			class="fs-fixed fl-editor-sidebar-group-rail fl-editor-sidebar-div-2"
		>
			<Rail expanded onNavigate={toggleSidebar} />
		</div>
	</div>
{/if}
