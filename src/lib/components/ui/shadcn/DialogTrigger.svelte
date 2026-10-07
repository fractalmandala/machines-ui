<script lang="ts">
	import { Trigger } from './dialog/index.js';
	import type { DialogTriggerProps } from './dialog/index.js';

	let { child, ...props }: DialogTriggerProps = $props();
</script>

<Trigger data-slot="dialog-trigger" {child} {...props} />
