<script module lang="ts">
	import './Input.css';
	import { cn, normalizeDomProps } from '$lib/utils/utils.js';

	export const fieldSurface =
		'fl-input-field-surface';
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	// `onChange`/`onFocus` are React-echo aliases: normalizeDomProps rewrites
	// them to the DOM's lowercase `onchange`/`onfocus` before the spread.
	let {
		className,
		...rest
	}: Omit<HTMLInputAttributes, 'class'> & {
		className?: string;
		onChange?: (event: Event & { target: HTMLInputElement; currentTarget: HTMLInputElement }) => void;
		onFocus?: (event: FocusEvent) => void;
	} = $props();

	let domProps = $derived(normalizeDomProps(rest));
</script>

<input {...domProps} class={cn(fieldSurface, 'fl-input', className)} />
