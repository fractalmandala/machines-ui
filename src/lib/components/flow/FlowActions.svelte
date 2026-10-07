<script lang="ts">
	import './FlowActions.css';
	import Button from '$lib/components/ui/button.svelte';
	import { flow } from '$lib/stores/flow-store.svelte';
	import PlayIcon from '$lib/icons/topbar/play.svelte';
	import McpConnect from './mcp-connect/mcp-connect.svelte';
	import { startRun, stopRun } from './canvas/flow-run.js';

	const running = $derived(flow.run.status === 'running');
</script>

<McpConnect />
<Button
	variant="accent"
	size="field"
	aria-live="polite"
	className="fl-flow-actions"
	onClick={() => (running ? stopRun() : startRun())}
>
	<span class="fs-relative fs-row fs-ycenter fs-xcenter fl-flow-actions-span">
		<PlayIcon
			aria-hidden="true"
			data-hidden={running || undefined}
			class="fs-absolute fl-flow-actions-play-icon"
		/>
		<span
			aria-hidden="true"
			data-hidden={!running || undefined}
			class="fs-absolute fs-radius-full fl-flow-actions-span-2"
		></span>
	</span>
	<span class="fs-pr-xs">{running ? 'Running…' : 'Run once'}</span>
</Button>
