<script module lang="ts">
	import './Textarea.css';
	import { cn, normalizeDomProps } from '$lib/utils/utils.js';

	export const fieldSurface =
		'fl-textarea-field-surface';
</script>

<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	// `onChange`/`onFocus` are React-echo aliases: normalizeDomProps rewrites
	// them to the DOM's lowercase `onchange`/`onfocus` before the spread.
	let {
		className,
		...rest
	}: Omit<HTMLTextareaAttributes, 'class'> & {
		className?: string;
		onChange?: (event: Event & { target: HTMLTextAreaElement; currentTarget: HTMLTextAreaElement }) => void;
		onFocus?: (event: FocusEvent) => void;
	} = $props();

	let domProps = $derived(normalizeDomProps(rest));
</script>

<textarea
	{...domProps}
	class={cn(fieldSurface, 'fl-textarea', className)}
></textarea>
