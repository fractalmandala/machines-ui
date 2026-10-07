<script lang="ts">
	import type { DropdownRadioGroupProps } from './dropdown-menu/dropdown-menu-state.svelte.js';
import { RadioGroup } from './dropdown-menu/index.js';
	

	let props: DropdownRadioGroupProps = $props();
</script>

<RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
