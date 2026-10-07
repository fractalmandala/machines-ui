<script module lang="ts">
	import './flow-controls.css';
	import Button from '$lib/components/ui/button.svelte';
	import ZoomInIcon from '$lib/icons/flow/zoom-in.svelte';
	import ZoomOutIcon from '$lib/icons/flow/zoom-out.svelte';
	import FitViewIcon from '$lib/icons/flow/fit-view.svelte';

	type FlowControlsProps = {
		canZoomIn: boolean;
		canZoomOut: boolean;
		onZoomIn: () => void;
		onZoomOut: () => void;
		/** True while both sidebars are folded away. */
		focused: boolean;
		onToggleFocus: () => void;
	};
</script>

<script lang="ts">
	let { canZoomIn, canZoomOut, onZoomIn, onZoomOut, focused, onToggleFocus }: FlowControlsProps = $props();
</script>

<div
	role="toolbar"
	aria-label="Canvas zoom"
	tabindex="0"
	onpointerdown={(event) => event.stopPropagation()}
	data-canvas-overlay
	class="fs-absolute fs-box fs-pad-bs fl-flow-controls"
>
	<Button
		variant="raised"
		size="icon"
		aria-label="Zoom in"
		disabled={!canZoomIn}
		onClick={onZoomIn}
	>
		<ZoomInIcon aria-hidden class="fl-flow-controls-zoom-in-icon" />
	</Button>
	<Button
		variant="raised"
		size="icon"
		aria-label="Zoom out"
		disabled={!canZoomOut}
		onClick={onZoomOut}
	>
		<ZoomOutIcon aria-hidden class="fl-flow-controls-zoom-out-icon" />
	</Button>
	<Button
		variant="raised"
		size="icon"
		aria-label={focused ? 'Show sidebars' : 'Hide sidebars'}
		aria-pressed={focused}
		onClick={onToggleFocus}
	>
		<FitViewIcon aria-hidden class="fl-flow-controls-fit-view-icon" />
	</Button>
</div>
