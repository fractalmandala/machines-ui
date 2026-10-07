<script module lang="ts">
	import './field.css';
	import './Input.css';
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils/utils.js';

	/** The surface of a text field, a dropdown trigger and a search box: one class, defined in Input.css. */
	export const fieldSurface = 'fl-input-field-surface';

	type FieldProps = {
		label: string;
		htmlFor?: string;
		hint?: string;
		action?: Snippet;
		className?: string;
		children: Snippet;
	};
</script>

<script lang="ts">
	let { label, htmlFor, hint, action, className, children }: FieldProps = $props();
</script>

<div class={cn('fl-field', className)}>
	<div class="fl-field-div">
		<label for={htmlFor} class="fl-field-label">{label}</label>
		{@render action?.()}
	</div>
	{@render children?.()}
	{#if hint}
		<span class="fl-field-span">{hint}</span>
	{/if}
</div>
