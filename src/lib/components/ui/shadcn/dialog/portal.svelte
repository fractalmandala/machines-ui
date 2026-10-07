<script lang="ts">
	import SharedPortal from '../dialog-portal.svelte';
	import type { DialogPortalProps } from './types.js';

	let { children }: DialogPortalProps = $props();
</script>

<SharedPortal>{@render children?.()}</SharedPortal>
