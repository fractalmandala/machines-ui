<script lang="ts">
	import { FlowNode, type FlowNodeProps } from '$lib/components/index.js';

	let props: Omit<FlowNodeProps, 'title' | 'children' | 'icon' | 'onportdown' | 'class'> = $props();
</script>

<div style="max-width: 22rem; margin: 0 auto; padding: 1rem 0">
	<FlowNode title="CORE" {...props}>
		<strong>Core Template</strong>
		<p>Triggered when scaffold begins.</p>
	</FlowNode>
</div>
