<script lang="ts">
	import './DialogTitle.css';
	import { Title } from './dialog/index.js';
	import { cn } from '$lib/utils/utils.js';
	import type { DialogTitleProps } from './dialog/index.js';

	let { className, ...props }: Omit<DialogTitleProps, 'class'> & { className?: string } = $props();
</script>

<Title
	data-slot="dialog-title"
	class={cn(
		'fl-dialog-title',
		className
	)}
	{...props}
/>
