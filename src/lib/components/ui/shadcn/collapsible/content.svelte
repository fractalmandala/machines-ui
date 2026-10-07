<script lang="ts">
	import { onDestroy } from 'svelte';
	import { mergeClass } from '$lib/utils/class.js';
	import {
		getCollapsibleRoot,
		waitForAnimationsComplete,
		type CollapsibleContentProps
	} from './collapsible-state.svelte.js';

	const uid = $props.id();

	let {
		class: className,
		child,
		ref = $bindable(null),
		forceMount = false,
		id = `collapsible-content-${uid}`,
		children,
		...rest
	}: CollapsibleContentProps = $props();

	const rootState = getCollapsibleRoot();

	// Presence: the element stays mounted (but hidden) while the close
	// animation plays, then is hidden — mirrors bits-ui's PresenceManager.
	let present = $state(rootState.open);
	// bits-ui skips the mount animation when the content starts open.
	let isMountAnimationPrevented = rootState.open;
	let mountRestoreFrame: number | null = null;
	// Monotonic token so a slow exit-animation waiter can't hide content that
	// has since been re-opened.
	let closeSequence = 0;

	let height = $state(0);
	let width = $state(0);

	function measure() {
		if (!ref) return;
		const original = {
			transitionDuration: ref.style.transitionDuration,
			animationName: ref.style.animationName
		};
		// block animations/transitions so the element renders at full dimensions
		ref.style.transitionDuration = '0s';
		ref.style.animationName = 'none';
		const rect = ref.getBoundingClientRect();
		height = rect.height;
		width = rect.width;
		if (isMountAnimationPrevented) {
			// initially open: keep animations blocked until the first frame has
			// painted so no mount animation flashes, then re-enable them.
			if (mountRestoreFrame !== null) cancelAnimationFrame(mountRestoreFrame);
			mountRestoreFrame = requestAnimationFrame(() => {
				mountRestoreFrame = null;
				if (!ref) return;
				ref.style.transitionDuration = original.transitionDuration;
				ref.style.animationName = original.animationName;
			});
		} else {
			ref.style.transitionDuration = original.transitionDuration;
			ref.style.animationName = original.animationName;
		}
	}

	onDestroy(() => {
		if (mountRestoreFrame !== null) cancelAnimationFrame(mountRestoreFrame);
	});

	$effect.pre(() => {
		// present before the DOM updates so the open animation can run
		if (rootState.open) present = true;
	});

	$effect(() => {
		const isOpen = rootState.open;
		rootState.setContentId(id);
		if (isOpen) {
			closeSequence += 1;
			measure();
			return;
		}
		if (forceMount || !ref) {
			present = false;
			return;
		}
		const sequence = ++closeSequence;
		let cancelled = false;
		waitForAnimationsComplete(ref).then(() => {
			if (cancelled || sequence !== closeSequence) return;
			if (rootState.open) return;
			present = false;
		});
		return () => {
			cancelled = true;
		};
	});

	let mergedProps: Record<string, unknown> = $derived({
		...rest,
		id,
		hidden: forceMount ? undefined : !present,
		style: [
			height ? `--bits-collapsible-content-height:${height}px` : undefined,
			width ? `--bits-collapsible-content-width:${width}px` : undefined
		]
			.filter(Boolean)
			.join(';'),
		'data-state': rootState.open ? 'open' : 'closed',
		'data-disabled': rootState.disabled ? '' : undefined
	});
</script>

{#if child}
	{@render child({ props: mergedProps, open: rootState.open })}
{:else}
	<div {...mergedProps} bind:this={ref} class={mergeClass(className)}>
		{@render children?.()}
	</div>
{/if}
