<script module lang="ts">
	import './mcp-connect.css';
	import '$lib/styles/palette.css';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import Divider from '$lib/components/ui/divider.svelte';
	import IconBadge from '$lib/components/ui/icon-badge.svelte';
	import Tag from '$lib/components/ui/tag.svelte';
	import Dialog from '$lib/components/ui/shadcn/dialog.svelte';
	import DialogClose from '$lib/components/ui/shadcn/DialogClose.svelte';
	import DialogContent from '$lib/components/ui/shadcn/DialogContent.svelte';
	import DialogDescription from '$lib/components/ui/shadcn/DialogDescription.svelte';
	import DialogTitle from '$lib/components/ui/shadcn/DialogTitle.svelte';
	import DialogTrigger from '$lib/components/ui/shadcn/DialogTrigger.svelte';
	import WebhookIcon from '$lib/icons/flow/webhook.svelte';
	import CloseIcon from '$lib/icons/flow/zoom-in.svelte';

	const TOOLS = [
		{
			name: 'list_steps',
			description: 'Read every step, branch and connection in this automation.'
		},
		{
			name: 'start_run',
			description: 'Start a run from the trigger.'
		},
		{
			name: 'run_once',
			description: 'Trace a test run end to end and return the path.'
		},
		{
			name: 'read_logs',
			description: 'Pull the log for the most recent run.'
		}
	];

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
	import { app } from '$lib/stores/app-store.svelte';
	import { flow } from '$lib/stores/flow-store.svelte';

	let { open, onOpenChange, hideTrigger }: McpConnectProps = $props();

	let internalOpen = $state(false);
	function setInternalOpen(value: StateInput<boolean>) {
		internalOpen = resolveState(internalOpen, value);
	}

	let isOpen = $derived(open ?? internalOpen);

	let setOpen = $derived(onOpenChange ?? setInternalOpen);

	const automation = $derived(app.automations.find((item) => item.id === app.automationId));

	const steps = $derived(flow.nodes.length);

	let slug = $derived(automation?.id ?? 'automation');

	let config = $derived(`{
	  "mcpServers": {
	    "machines": {
	      "command": "npx",
	      "args": [
	        "-y",
	        "@machines/mcp",
	        "--automation", "${slug}"
	      ],
	      "env": { "MACHINES_API_KEY": "sk_live_•••••" }
	    }
	  }
	}`);

	let prompt = $derived(
		`Enroll sarah@example.com in “${automation?.name ?? 'this automation'}”, run it once, then tell me which branch she lands on and why.`
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
					<DialogDescription>Let Claude or any MCP client drive this automation.</DialogDescription>
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
				<pre
					class="fs-px-bs fs-py-md fl-mcp-connect-pre">
					<code>{config}</code>
				</pre>
			</div>
			<div class="fs-box fs-gap-sm">
				<div class="fs-row fs-ycenter fs-xbetween fs-gap-md">
					<span class="fs-weight-500 fl-mcp-connect-span-3">Then try this prompt</span>
					<Button
						variant="field"
						size="field"
						className="fl-mcp-connect-button-2"
						onClick={() => copy(prompt, 'Prompt')}>Copy</Button
					>
				</div>
				<p
					class="fs-px-bs fs-py-md fl-mcp-connect-p"
				>
					{prompt}
				</p>
			</div>
			<div class="fs-box fs-gap-sm">
				<span class="fs-weight-500 fl-mcp-connect-span-4">Tools it exposes</span>
				<div class="fs-box fs-gap-xs">
					{#each TOOLS as tool (tool.name)}
						<div class="fs-row fs-gap-md fs-px-sm fl-mcp-connect-div-11">
							<span class="fs-shrink-0 fl-mcp-connect-span-5"
								>{tool.name}</span
							>
							<span class="fs-minw0 fl-mcp-connect-span-6">{tool.description}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
		<Divider />
		<div class="fs-row fs-shrink-0 fs-ycenter fs-xbetween fs-gap-md fl-mcp-connect-div-12">
			<span class="fs-row fs-ycenter fs-gap-sm">
				<Tag tone="neutral">Not connected</Tag>
				<span class="fl-mcp-connect-span-8"
					>{steps} steps exposed</span
				>
			</span>
			<Button
				variant="accent"
				size="field"
				className="fs-px-md"
				onClick={() => {
					copy(config, 'Config');
					setOpen(false);
				}}
			>
				Copy config & close
			</Button>
		</div>
	</DialogContent>
</Dialog>
