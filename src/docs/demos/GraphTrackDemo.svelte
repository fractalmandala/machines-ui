<script lang="ts">
	import { Frame, FrameBody, GraphTrack, GraphTick } from '$lib/components/index.js';
</script>

<Frame title="TRACK">
	<FrameBody>
		<GraphTrack>
			{#each ['█', '█', '█', '█', '░', '░', '░', '░'] as glyph}
				<GraphTick>{glyph}</GraphTick>
			{/each}
		</GraphTrack>
	</FrameBody>
</Frame>
