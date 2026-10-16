<script lang="ts">
	import { ButtonMachineOutline } from '$lib/components/index.js';

	let { href, disabled = false }: { href?: string; disabled?: boolean } = $props();
</script>

<div class="fs-row">
	<ButtonMachineOutline {href} {disabled}>Button</ButtonMachineOutline>
</div>
