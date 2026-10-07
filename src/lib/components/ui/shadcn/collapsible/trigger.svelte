<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import {
		getCollapsibleRoot,
		type CollapsibleTriggerProps
	} from './collapsible-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		disabled = false,
		onclick,
		onkeydown,
		children,
		...rest
	}: CollapsibleTriggerProps = $props();

	const rootState = getCollapsibleRoot();

	let isDisabled = $derived(disabled || rootState.disabled);

	function handleClick(event: MouseEvent) {
		onclick?.(event);
		if (event.defaultPrevented || isDisabled) return;
		if (event.button !== 0) return event.preventDefault();
		rootState.toggle();
	}

	function handleKeydown(event: KeyboardEvent) {
		onkeydown?.(event);
		if (event.defaultPrevented || isDisabled) return;
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		rootState.toggle();
	}

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		type: 'button',
		disabled: isDisabled || undefined,
		'aria-controls': rootState.contentId,
		'aria-expanded': rootState.open,
		'data-state': rootState.open ? 'open' : 'closed',
		'data-disabled': isDisabled ? '' : undefined,
		onclick: handleClick,
		onkeydown: handleKeydown
	});
</script>

{#if child}
	{@render child({ props: mergedProps, open: rootState.open })}
{:else}
	<button {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.()}
	</button>
{/if}
