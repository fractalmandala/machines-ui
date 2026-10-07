<script module lang="ts">
	import './button.css';
	import type { SvelteHTMLElements } from 'svelte/elements';
	import { clsx } from 'clsx';
	import { normalizeDomProps } from '$lib/utils/utils.js';

	export type ButtonVariant =
		| 'primary'
		| 'secondary'
		| 'field'
		| 'accent'
		| 'ghost'
		| 'raised'
		| 'brick'
		| 'bare'
		| 'crumb'
		| 'round'
		| 'nav'
		| 'tab';

	export type ButtonSize =
		| 'sm'
		| 'md'
		| 'lg'
		| 'xs'
		| 'field'
		| 'block'
		| 'crumb'
		| 'bare'
		| 'title'
		| 'icon'
		| 'icon-lg'
		| 'tab';

	// The look lives in button.css, addressed by data-variant / data-size, with zero
	// specificity so any class a caller adds wins. Nothing is inlined from fractalstyler:
	// an inline fs class would compete with the caller's own.

	type ButtonProps = {
		variant?: ButtonVariant;
		size?: ButtonSize;
	} & SvelteHTMLElements['button'] & {
			href?: string;
			className?: string;
			// React-style aliases accepted from ported call sites; normalized to lowercase by normalizeDomProps
			onClick?: SvelteHTMLElements['button']['onclick'];
			onDoubleClick?: SvelteHTMLElements['button']['ondblclick'];
		};
</script>

<script lang="ts">
	let {
		variant = 'primary',
		size = 'lg',
		className,
		href,
		children,
		...rest
	}: ButtonProps = $props();

	let domProps = $derived(normalizeDomProps(rest));

	let classes = $derived(clsx('fl-button', className));
</script>

{#if href}
	<a {href} {...domProps} class={classes} data-variant={variant} data-size={size}>
		{@render children?.()}
	</a>
{:else}
	<button type="button" {...domProps} class={classes} data-variant={variant} data-size={size}>
		{@render children?.()}
	</button>
{/if}
