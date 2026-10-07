<script lang="ts">
	import './DialogDescription.css';
	import { Description } from './dialog/index.js';
	import { cn } from '$lib/utils/utils.js';
	import type { DialogDescriptionProps } from './dialog/index.js';

	let { className, ...props }: Omit<DialogDescriptionProps, 'class'> & { className?: string } =
		$props();
</script>

<Description
	data-slot="dialog-description"
	class={cn('fl-dialog-description', className)}
	{...props}
/>
