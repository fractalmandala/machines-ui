<script lang="ts">
	import './editor-title.css';
	import Button from '$lib/components/ui/button.svelte';
	import { app, updateAutomation } from '$lib/stores/app-store.svelte';

	const automation = $derived(app.automations.find((item) => item.id === app.automationId));

	const renameRequest = $derived(app.renameRequest);

	let draft = $state<string | null>(null);

	let handledRename = $state(app.renameRequest);

	let cancelled = false;

	$effect(() => {
		if (handledRename === renameRequest || !automation) return;
		handledRename = renameRequest;
		const name = automation.name;
		queueMicrotask(() => (draft = name));
	});

	const startEditing = () => {
		cancelled = false;
		draft = automation?.name ?? null;
	};

	const autofocus = (node: HTMLInputElement) => {
		node.focus();
	};

	const commit = () => {
		if (cancelled) {
			cancelled = false;
			return;
		}
		if (!automation) {
			draft = null;
			return;
		}
		const name = draft?.trim();
		if (name && name !== automation.name)
			updateAutomation(automation.id, {
				name
			});
		draft = null;
	};
</script>

{#if automation}
	<div
		class="fs-absolute fl-editor-title"
	>
		{#if draft === null}
			<Button
				variant="ghost"
				size="title"
				title="Double-click to rename"
				onDoubleClick={startEditing}
				onkeydown={(event: KeyboardEvent) => {
					if (event.key === 'Enter' || event.key === 'F2') startEditing();
				}}
				className="fl-editor-title-button"
			>
				<span class="fs-truncate">{automation.name}</span>
			</Button>
		{:else}
			<span class="fl-editor-title-span-2">
				<span
					aria-hidden="true"
					class="fl-editor-title-span-3"
				>
					{draft || ' '}
				</span>
				<input
					bind:value={draft}
					use:autofocus
					onfocus={(event) => event.currentTarget.select()}
					aria-label="Automation name"
					maxlength={60}
					onblur={commit}
					onkeydown={(event) => {
						if (event.key === 'Enter') commit();
						if (event.key === 'Escape') {
							cancelled = true;
							draft = null;
						}
					}}
					class="fs-ta-c fs-text-white fl-editor-title-automation-name"
				/>
			</span>
		{/if}
	</div>
{/if}
