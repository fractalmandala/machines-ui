<script lang="ts">
	import './MobileMenu.css';
	import { resolveState, type StateInput } from '$lib/utils/utils.js';
	import Button from '$lib/components/ui/button.svelte';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte'; 
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte'; 
	import DropdownMenuItem from '$lib/components/ui/shadcn/DropdownMenuItem.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte'
	import MoreIcon from '$lib/icons/topbar/more.svelte';
	import WebhookIcon from '$lib/icons/flow/webhook.svelte';
	import McpConnect from './mcp-connect/mcp-connect.svelte';

	let mcpOpen = $state(false);
	function setMcpOpen(value: StateInput<boolean>) {
		mcpOpen = resolveState(mcpOpen, value);
	}
</script>

<McpConnect hideTrigger open={mcpOpen} onOpenChange={setMcpOpen} />
<DropdownMenu>
	<DropdownMenuTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="field" size="field" aria-label="More actions" className="fl-mobile-menu">
				<MoreIcon aria-hidden class="fl-mobile-menu-more-icon" />
			</Button>
		{/snippet}
	</DropdownMenuTrigger>
	<DropdownMenuContent align="end" className="fl-mobile-menu-dropdown-menu-conten">
		<DropdownMenuItem onSelect={() => (mcpOpen = true)}>
			<WebhookIcon aria-hidden class="fl-mobile-menu-webhook-icon" />Connect MCP
		</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>
