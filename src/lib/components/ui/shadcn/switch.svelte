<script lang="ts">
	import './switch.css';
	import { Root, Thumb } from './switch/index.js';
	import { cn } from '$lib/utils/utils.js';
	import type { SwitchRootProps } from './switch/switch-state.svelte.js';

	let { className, ...props }: Omit<SwitchRootProps, 'class'> & { className?: string } = $props();
</script>

<Root
	data-slot="switch"
	class={cn(
		'fl-switch-peer fl-switch',
		className
	)}
	{...props}
>
	<Thumb
		data-slot="switch-thumb"
		class="fl-switch-switch-thumb"
	/>
</Root>
