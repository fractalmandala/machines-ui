<script lang="ts">
	import { Frame, FrameBody } from '$lib/components/index.js';

	let { tight = false }: { tight?: boolean } = $props();
</script>

<Frame title="BODY">
	<FrameBody {tight}>
		<p>Row one</p>
		<p>Row two</p>
		<p>Row three</p>
	</FrameBody>
</Frame>
