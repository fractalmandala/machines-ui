<script lang="ts">
	import { Frame, FrameBody, GraphArrow } from '$lib/components/index.js';

	let { accent = false, stretch = false }: { accent?: boolean; stretch?: boolean } = $props();
</script>

<Frame title="ARROW">
	<FrameBody>
		<div class="docs-arrow-row">
			<span>build</span>
			<GraphArrow {accent} {stretch} />
			<span>ship</span>
		</div>
	</FrameBody>
</Frame>
