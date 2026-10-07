<script lang="ts">
	import type { DropdownTriggerProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { Trigger } from './dropdown-menu/index.js';
	

	let {
		child,
		className,
		...props
	}: {
		child?: DropdownTriggerProps['child'];
		className?: string;
		[key: string]: unknown;
	} = $props();
</script>

<Trigger data-slot="dropdown-menu-trigger" {child} class={className} {...props} />
