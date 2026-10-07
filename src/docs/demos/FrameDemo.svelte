<script lang="ts">
	import { Frame, FrameBody, type FrameProps } from '$lib/components/index.js';

	let { pad = 'md', ...rest }: Omit<FrameProps, 'children'> = $props();
</script>

<Frame {pad} {...rest}>
	<FrameBody>
		<p>Content goes inside the frame.</p>
	</FrameBody>
</Frame>
