<script lang="ts">
	import {
		setTooltipProvider,
		type TooltipProviderProps,
		type TooltipProviderState,
		type TooltipRootState
	} from './tooltip-state.svelte.js';

	let {
		delayDuration = 700,
		skipDelayDuration = 300,
		disableHoverableContent = false,
		disableCloseOnTriggerClick = false,
		closeOnEscape = true,
		closeOnPointerDown = true,
		children
	}: TooltipProviderProps = $props();

	// bits-ui semantics: after any tooltip closes, subsequent triggers open
	// instantly (no hover delay) for skipDelayDuration milliseconds. When
	// skipDelayDuration is 0 there is no grace period at all.
	let lastClosedAt = -Infinity;
	let openRoot: TooltipRootState | null = null;

	const providerState: TooltipProviderState = {
		get delayDuration() {
			return delayDuration;
		},
		get skipDelayDuration() {
			return skipDelayDuration;
		},
		get disableHoverableContent() {
			return disableHoverableContent;
		},
		get disableCloseOnTriggerClick() {
			return disableCloseOnTriggerClick;
		},
		get closeOnEscape() {
			return closeOnEscape;
		},
		get closeOnPointerDown() {
			return closeOnPointerDown;
		},
		isSkipDelayActive: () =>
			skipDelayDuration > 0 && Date.now() - lastClosedAt < skipDelayDuration,
		notifyOpened: (root) => {
			if (openRoot && openRoot !== root) openRoot.handleClose();
			openRoot = root;
			lastClosedAt = -Infinity;
		},
		notifyClosed: (root) => {
			if (openRoot === root) openRoot = null;
			lastClosedAt = Date.now();
		}
	};
	setTooltipProvider(providerState);
</script>

{@render children?.()}
