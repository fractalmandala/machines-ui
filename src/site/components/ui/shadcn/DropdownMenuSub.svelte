<script lang="ts">
	import type { DropdownSubProps } from '$lib/components/ui/shadcn/dropdown-menu/dropdown-menu-state.svelte.js';
import { Sub } from '$lib/components/ui/shadcn/dropdown-menu/index.js';
	

	let props: DropdownSubProps = $props();
</script>

<Sub {...{ 'data-slot': 'dropdown-menu-sub', ...props }} />
