<script lang="ts">
	import { mergeClass } from '$lib/utils/class.js';
	import { setSwitchRoot, type SwitchRootProps, type SwitchRootState } from './switch-state.svelte.js';

	let {
		class: className,
		child,
		ref = $bindable(null),
		checked = $bindable(false),
		disabled = false,
		required = false,
		name = undefined,
		value = 'on',
		type = 'button',
		onCheckedChange,
		onclick,
		onkeydown,
		children,
		...rest
	}: SwitchRootProps = $props();

	const rootState: SwitchRootState = {
		get checked() {
			return checked;
		},
		get disabled() {
			return disabled;
		},
		toggle() {
			if (disabled) return;
			const next = !checked;
			checked = next;
			onCheckedChange?.(next);
		}
	};
	setSwitchRoot(rootState);

	function handleClick(event: MouseEvent) {
		onclick?.(event);
		if (event.defaultPrevented) return;
		rootState.toggle();
	}

	function handleKeydown(event: KeyboardEvent) {
		onkeydown?.(event);
		if (event.defaultPrevented) return;
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		rootState.toggle();
	}

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		type,
		role: 'switch',
		disabled: disabled || undefined,
		'aria-checked': checked,
		'aria-required': required || undefined,
		'data-state': checked ? 'checked' : 'unchecked',
		'data-disabled': disabled ? '' : undefined,
		'data-required': required ? '' : undefined,
		onclick: handleClick,
		onkeydown: handleKeydown
	});
</script>

{#if child}
	{@render child({ props: mergedProps, checked })}
{:else}
	<button {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.({ checked })}
	</button>
{/if}

{#if name !== undefined}
	<input
		type="checkbox"
		{name}
		{value}
		checked={checked}
		{disabled}
		{required}
		hidden
		aria-hidden="true"
		tabindex={-1}
	/>
{/if}
