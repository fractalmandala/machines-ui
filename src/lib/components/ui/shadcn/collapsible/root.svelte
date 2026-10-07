<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		setCollapsibleRoot,
		type CollapsibleRootProps,
		type CollapsibleRootState
	} from './collapsible-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		open = $bindable(false),
		disabled = false,
		onOpenChange,
		children,
		...rest
	}: CollapsibleRootProps = $props();

	let contentId = $state<string | undefined>(undefined);

	const rootState: CollapsibleRootState = {
		get open() {
			return open;
		},
		get disabled() {
			return disabled;
		},
		get contentId() {
			return contentId;
		},
		setContentId: (id) => {
			contentId = id;
		},
		setOpen: (value) => {
			open = value;
			onOpenChange?.(value);
		},
		toggle: () => {
			rootState.setOpen(!open);
		}
	};
	setCollapsibleRoot(rootState);

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		'data-state': open ? 'open' : 'closed',
		'data-disabled': disabled ? '' : undefined
	});
</script>

{#if child}
	{@render child({ props: mergedProps, open })}
{:else}
	<div {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.({ open })}
	</div>
{/if}
