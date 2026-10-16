<script module lang="ts">
	import './export-dialog.css';
	import Button from '$lib/components/ui/button.svelte';
	import Dialog from '$lib/components/ui/shadcn/dialog.svelte';
	import DialogContent from '$lib/components/ui/shadcn/DialogContent.svelte';
	import DialogTitle from '$lib/components/ui/shadcn/DialogTitle.svelte';
	import DialogTrigger from '$lib/components/ui/shadcn/DialogTrigger.svelte';
	import RowInsertIcon from '$lib/icons/flow/row-insert.svelte';
	import Export from './export.svelte';
</script>

<script lang="ts">
	let open = $state(false);
</script>

<Dialog {open} onOpenChange={(value) => (open = value)}>
	<DialogTrigger>
		{#snippet child({ props })}
			<Button {...props} variant="field" size="field" className="fl-export-dialog-trigger">
				<RowInsertIcon aria-hidden class="fl-export-dialog-icon" />
				<span class="fs-pr-xs">Export</span>
			</Button>
		{/snippet}
	</DialogTrigger>
	<DialogContent aria-describedby={undefined} className="fl-export-dialog">
		<DialogTitle className="fl-export-dialog-title">Export or import</DialogTitle>
		<div class="fl-export-dialog-body"><Export /></div>
	</DialogContent>
</Dialog>
