<script lang="ts">
	import { Root } from './dialog/index.js';
	import type { DialogRootProps } from './dialog/index.js';

	let props: DialogRootProps = $props();
</script>

<Root {...{ 'data-slot': 'dialog', ...props }} />
