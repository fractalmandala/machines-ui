<script lang="ts">
	import type { DropdownGroupProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { Group } from './dropdown-menu/index.js';
	

	let props: DropdownGroupProps = $props();
</script>

<Group data-slot="dropdown-menu-group" {...props} />
