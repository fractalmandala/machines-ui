<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import { getSwitchRoot, type SwitchThumbProps } from './switch-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		children,
		...rest
	}: SwitchThumbProps = $props();

	const rootState = getSwitchRoot();

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		'data-state': rootState.checked ? 'checked' : 'unchecked',
		'data-disabled': rootState.disabled ? '' : undefined
	});
</script>

{#if child}
	{@render child({ props: mergedProps, checked: rootState.checked })}
{:else}
	<span {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.({ checked: rootState.checked })}
	</span>
{/if}
