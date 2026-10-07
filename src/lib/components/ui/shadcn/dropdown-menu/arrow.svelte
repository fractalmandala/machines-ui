<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import { useDropdownMenu } from './dropdown-menu-state.svelte.js';

	let {
		class: className,
		ref = $bindable(null),
		width = 10,
		height = 5,
		...rest
	}: { class?: string; ref?: HTMLElement | null; width?: number; height?: number } & Record<
		string,
		unknown
	> = $props();

	const menu = useDropdownMenu();
	void menu;
</script>

<span
	bind:this={ref}
	aria-hidden="true"
	class={mergeClass(className)}
	style={`pointer-events:none;display:inline-block;width:${width}px;height:${height}px`}
	{...rest}
></span>
