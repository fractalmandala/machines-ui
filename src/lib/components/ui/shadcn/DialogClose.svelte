<script lang="ts">
	import { Close } from './dialog/index.js';
	import type { DialogCloseProps } from './dialog/index.js';

	let { child, ...props }: DialogCloseProps = $props();
</script>

<Close data-slot="dialog-close" {child} {...props} />
