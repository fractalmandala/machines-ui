<script module lang="ts">
	import './DialogContent.css';
	const contentVariants = {
		modal:
			'fl-dialog-content-content-variants',
		sheet:
			'fl-dialog-content-content-variants-2'
	};
</script>

<script lang="ts">
	import { Content, Overlay, Portal } from './dialog/index.js';
	import { cn } from '$lib/utils/utils.js';
	import type { DialogContentProps } from './dialog/index.js';
	import type { Snippet } from 'svelte';

	let {
		className,
		children,
		variant = 'modal',
		...props
	}: Omit<DialogContentProps, 'children'> & {
		className?: string;
		variant?: keyof typeof contentVariants;
		children?: Snippet;
	} = $props();
</script>

<Portal>
	<Overlay
		class="fl-dialog-content"
	/>
	<Content
		data-slot="dialog-content"
		class={cn(
			'fl-dialog-content-dialog-content',
			contentVariants[variant],
			className
		)}
		{...props}
	>
		{@render children?.()}
	</Content>
</Portal>
