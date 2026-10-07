<script module lang="ts">
	import './BranchLabel.css';
	import '$lib/styles/palette.css';
	import type { PortId } from '$lib/stores/flow-store.svelte';
	import { type Point } from './flow-geometry.js';

	const labelText: Partial<Record<PortId, string>> = {
		true: 'TRUE',
		false: 'FALSE'
	};

	function positionStyle(point: Point) {
		return `--point-x:${point.x}px;--point-y:${point.y}px;`;
	}
</script>

<script lang="ts">
	let { point, port }: { point: Point; port: PortId } = $props();
</script>

<span
	style={positionStyle(point)}
	class="fl-branch-label fs-absolute fs-row fs-ycenter fs-h-md fs-weight-700"
>
	{labelText[port]}
</span>
