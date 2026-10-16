<script lang="ts">
	import { ButtonMachine } from '$lib/components/index.js';

	let { href, disabled = false }: { href?: string; disabled?: boolean } = $props();
</script>

<div class="fs-row">
	<ButtonMachine {href} {disabled}>Button</ButtonMachine>
</div>
