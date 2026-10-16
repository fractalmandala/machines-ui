<script module lang="ts">
	import './mcp-connect.css';
	import '$lib/styles/palette.css';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import Divider from '$lib/components/ui/divider.svelte';
	import IconBadge from '$lib/components/ui/icon-badge.svelte';
	import Dialog from '$lib/components/ui/shadcn/dialog.svelte';
	import DialogClose from '$lib/components/ui/shadcn/DialogClose.svelte';
	import DialogContent from '$lib/components/ui/shadcn/DialogContent.svelte';
	import DialogDescription from '$lib/components/ui/shadcn/DialogDescription.svelte';
	import DialogTitle from '$lib/components/ui/shadcn/DialogTitle.svelte';
	import DialogTrigger from '$lib/components/ui/shadcn/DialogTrigger.svelte';
	import WebhookIcon from '$lib/icons/flow/webhook.svelte';
	import CloseIcon from '$lib/icons/flow/zoom-in.svelte';

	function copy(value: string, label: string) {
		navigator.clipboard?.writeText(value).catch(() => {});
		toast.success(`${label} copied`, {
			description: 'Paste it into your MCP client and reload it.'
		});
	}

	type McpConnectProps = {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		hideTrigger?: boolean;
	};
</script>

<script lang="ts">
	import { resolveState, type StateInput } from '$lib/utils/utils.js';
	import { activeAutomation } from '$lib/stores/app-store.svelte';
	import { flow } from '$lib/stores/flow-store.svelte';
	import { mcpConfigText } from '$lib/engine/index.js';

	let { open, onOpenChange, hideTrigger }: McpConnectProps = $props();

	let internalOpen = $state(false);
	function setInternalOpen(value: StateInput<boolean>) {
		internalOpen = resolveState(internalOpen, value);
	}

	let isOpen = $derived(open ?? internalOpen);

	let setOpen = $derived(onOpenChange ?? setInternalOpen);

	const automation = $derived(activeAutomation());

	// derived from this workflow's own steps (specs/run-export-mcp.md, 9.1): it follows the canvas
	let config = $derived(
		mcpConfigText(automation?.name ?? 'workflow', { nodes: flow.nodes, edges: flow.edges })
	);
</script>

<Dialog open={isOpen} onOpenChange={setOpen}>
	{#if !hideTrigger}
		<DialogTrigger>
			{#snippet child({ props })}
				<Button {...props} variant="field" size="field" className="fl-mcp-connect">
					<WebhookIcon aria-hidden class="fl-mcp-connect-webhook-icon" />
					<span class="fs-pr-xs">Connect MCP</span>
				</Button>
			{/snippet}
		</DialogTrigger>
	{/if}
	<DialogContent aria-describedby={undefined}>
		<div class="fs-row fs-shrink-0 fs-ytop fs-xbetween fs-gap-bs fl-mcp-connect-div">
			<div class="fs-row fs-minw0 fs-ycenter fl-mcp-connect-div-2">
				<IconBadge><WebhookIcon class="fs-text-white fl-mcp-connect-webhook-icon-2" /></IconBadge>
				<div class="fs-minw0 fs-box">
					<DialogTitle>Connect to MCP</DialogTitle>
					<DialogDescription>The config an MCP client would use for this workflow.</DialogDescription>
				</div>
			</div>
			<DialogClose>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" size="icon" aria-label="Close">
						<CloseIcon
							aria-hidden
							class="fl-mcp-connect-close-icon"
						/>
					</Button>
				{/snippet}
			</DialogClose>
		</div>
		<Divider />
		<div class="fs-minh0 fs-box fl-mcp-connect-div-4">
			<p class="fs-px-bs fs-py-md fl-mcp-connect-note" role="note">
				<strong>This is the shape of the MCP server for this workflow.</strong> To actually run the server,
				please host it. This site does not provide hosting.
			</p>
			<div class="fs-box fs-gap-sm">
				<div class="fs-row fs-ycenter fs-xbetween fs-gap-md">
					<span class="fs-weight-500 fl-mcp-connect-span-2">Server config</span>
					<Button
						variant="field"
						size="field"
						className="fl-mcp-connect-button"
						onClick={() => copy(config, 'Config')}>Copy</Button
					>
				</div>
				<pre class="fs-px-bs fs-py-md fl-mcp-connect-pre"><code>{config}</code></pre>
			</div>
		</div>
	</DialogContent>
</Dialog>
