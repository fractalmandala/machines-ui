<script lang="ts">
	import { Root } from './dropdown-menu/index.js';
	import type { DropdownRootProps } from './dropdown-menu/dropdown-menu-state.svelte.js';

	let props: DropdownRootProps = $props();
</script>

<Root {...{ 'data-slot': 'dropdown-menu', ...props }} />
