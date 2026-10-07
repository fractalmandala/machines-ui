<script lang="ts">
	import {
		getTooltipProvider,
		setTooltipRoot,
		type TooltipArrowPosition,
		type TooltipRootProps,
		type TooltipRootState,
		type TooltipTriggerRecord
	} from './tooltip-state.svelte.js';

	let {
		open = $bindable(false),
		defaultOpen = false,
		disabled = false,
		delayDuration = undefined,
		disableHoverableContent = undefined,
		disableCloseOnTriggerClick = undefined,
		onOpenChange,
		children
	}: TooltipRootProps = $props();

	const provider = getTooltipProvider();

	let activeTrigger = $state<TooltipTriggerRecord | null>(null);
	let contentId = $state<string | undefined>(undefined);
	let contentNode = $state<HTMLElement | null>(null);
	let arrow = $state<TooltipArrowPosition | null>(null);
	// plain Map, not $state: register/unregister run inside the trigger's
	// $effect — a reactive read+write there would re-run the effect forever.
	// Only event handlers read this map, so no reactivity needed.
	const triggers = new Map<string, TooltipTriggerRecord>();
	let openTimer: ReturnType<typeof setTimeout> | null = null;
	let closeGraceTimer: ReturnType<typeof setTimeout> | null = null;
	// mirrors bits-ui: whether the current open period went through the hover delay
	let wasOpenDelayed = $state(false);

	$effect.pre(() => {
		if (defaultOpen && !open) {
			open = true;
		}
	});

	function clearOpenTimer() {
		if (openTimer !== null) {
			clearTimeout(openTimer);
			openTimer = null;
		}
	}

	function clearGraceTimer() {
		if (closeGraceTimer !== null) {
			clearTimeout(closeGraceTimer);
			closeGraceTimer = null;
		}
	}

	function setOpen(value: boolean) {
		if (open === value) return;
		open = value;
		onOpenChange?.(value);
		if (value) provider?.notifyOpened(rootState);
		else provider?.notifyClosed(rootState);
	}

	const rootState: TooltipRootState = {
		get open() {
			return open;
		},
		get disabled() {
			return disabled;
		},
		get delayDuration() {
			return delayDuration ?? provider?.delayDuration ?? 700;
		},
		get disableHoverableContent() {
			return disableHoverableContent ?? provider?.disableHoverableContent ?? false;
		},
		get disableCloseOnTriggerClick() {
			return disableCloseOnTriggerClick ?? provider?.disableCloseOnTriggerClick ?? false;
		},
		get stateAttr() {
			return open ? (wasOpenDelayed ? 'delayed-open' : 'instant-open') : 'closed';
		},
		get activeTrigger() {
			return activeTrigger;
		},
		get contentId() {
			return contentId;
		},
		get contentNode() {
			return contentNode;
		},
		get arrow() {
			return arrow;
		},
		registerTrigger: (record) => {
			triggers.set(record.id, record);
		},
		unregisterTrigger: (id) => {
			if (!triggers.has(id)) return;
			triggers.delete(id);
			if (activeTrigger?.id === id) {
				activeTrigger = null;
				if (open) rootState.handleClose();
			}
		},
		isTriggerNode: (node) => {
			for (const record of triggers.values()) {
				if (record.node && record.node.contains(node)) return true;
			}
			return false;
		},
		setActiveTrigger: (record) => {
			activeTrigger = record;
		},
		setContent: (id, node) => {
			contentId = id;
			contentNode = node;
		},
		setArrow: (value) => {
			arrow = value;
		},
		onTriggerEnter: (id, node) => {
			activeTrigger = { id, node };
			clearOpenTimer();
			clearGraceTimer();
			const delay = rootState.delayDuration;
			if ((provider?.isSkipDelayActive() ?? false) || delay === 0) {
				wasOpenDelayed = false;
				setOpen(true);
			} else {
				wasOpenDelayed = true;
				openTimer = setTimeout(() => {
					openTimer = null;
					setOpen(true);
				}, delay);
			}
		},
		onTriggerLeave: () => {
			clearOpenTimer();
			if (rootState.disableHoverableContent) {
				rootState.handleClose();
			} else if (open) {
				// grace period to cross the gap between trigger and content
				clearGraceTimer();
				closeGraceTimer = setTimeout(() => {
					closeGraceTimer = null;
					rootState.handleClose();
				}, 180);
			}
		},
		onContentEnter: () => {
			clearGraceTimer();
			clearOpenTimer();
		},
		onContentLeave: () => {
			rootState.handleClose();
		},
		cancelPendingOpen: () => {
			clearOpenTimer();
		},
		handleOpen: () => {
			clearOpenTimer();
			clearGraceTimer();
			wasOpenDelayed = false;
			setOpen(true);
		},
		handleClose: () => {
			clearOpenTimer();
			clearGraceTimer();
			setOpen(false);
		}
	};
	setTooltipRoot(rootState);

	// global close conditions while open: Escape, pointer down outside,
	// scrolling the trigger out of view
	$effect(() => {
		if (!rootState.open) return;
		const closeOnEscape = provider?.closeOnEscape ?? true;
		const closeOnPointerDown = provider?.closeOnPointerDown ?? true;

		const onScroll = (event: Event) => {
			const triggerNode = rootState.activeTrigger?.node;
			if (!triggerNode) return;
			const target = event.target;
			if (target instanceof Node && target.contains(triggerNode)) {
				rootState.handleClose();
			}
		};
		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && closeOnEscape) {
				event.preventDefault();
				rootState.handleClose();
			}
		};
		const onPointerdown = (event: PointerEvent) => {
			if (!closeOnPointerDown) return;
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (rootState.contentNode?.contains(target)) return;
			if (rootState.isTriggerNode(target)) return;
			rootState.handleClose();
		};

		window.addEventListener('scroll', onScroll);
		document.addEventListener('keydown', onKeydown);
		document.addEventListener('pointerdown', onPointerdown, true);
		return () => {
			window.removeEventListener('scroll', onScroll);
			document.removeEventListener('keydown', onKeydown);
			document.removeEventListener('pointerdown', onPointerdown, true);
		};
	});
</script>

{@render children?.()}
