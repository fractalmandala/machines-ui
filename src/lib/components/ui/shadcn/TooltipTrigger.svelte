<script lang="ts">
	import { Trigger } from './tooltip/index.js';
	import type { TooltipTriggerProps } from './tooltip/tooltip-state.svelte.js';

	let { child, ...props }: TooltipTriggerProps = $props();
</script>

<Trigger data-slot="tooltip-trigger" {child} {...props} />
