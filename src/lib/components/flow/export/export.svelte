<script module lang="ts">
	import './export.css';
	import '$lib/styles/palette.css';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import { Input } from '$lib/components/ui/field.js';
	import Switch from '$lib/components/ui/shadcn/switch.svelte';
	import Tag from '$lib/components/ui/tag.svelte';
	import { cn , resolveState, type StateInput } from '$lib/utils/utils.js';
	import WebhookIcon from '$lib/icons/flow/webhook.svelte';
	import LayoutIcon from '$lib/icons/flow/layout.svelte';
	import RowInsertIcon from '$lib/icons/flow/row-insert.svelte';
	import ShareIcon from '$lib/icons/topbar/share.svelte';
	import PostsIcon from '$lib/icons/overview/posts.svelte';
	import SettingsSection from '../settings/settings-section.svelte';
import SettingsRow from '../settings/SettingsRow.svelte';
	import ExportPreview from './export-preview.svelte';
	import { FORMAT_META, buildExport, fileName, testRunOf, type ExportFormat } from './export-formats.js';
	import { FlowParseError, importFlow, type Problem } from '$lib/engine/index.js';

	const FORMAT_ICONS = {
		json: {
			Icon: WebhookIcon,
			theme: 'fl-export-theme-json'
		},
		markdown: {
			Icon: LayoutIcon,
			theme: 'fl-export-theme-markdown'
		}
	};

	function copy(text: string, message: string) {
		navigator.clipboard
			?.writeText(text)
			.then(() => toast.success(message))
			.catch(() => toast('Copy isn’t available in this browser'));
	}

	function formatBytes(bytes: number) {
		return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
	}
</script>

<script lang="ts">
	import { activeAutomation, app, DEFAULT_SETTINGS, importAutomation, updateSettings } from '$lib/stores/app-store.svelte';
	import { flow } from '$lib/stores/flow-store.svelte';

	const automation = $derived(activeAutomation());

	const settings = $derived(app.settings[app.automationId] ?? DEFAULT_SETTINGS);

	const nodes = $derived(flow.nodes);

	const edges = $derived(flow.edges);

	let format = $state<ExportFormat>('json');

	let includeLogs = $state(false);
	function setIncludeLogs(value: StateInput<boolean>) {
		includeLogs = resolveState(includeLogs, value);
	}

	const testRun = $derived(testRunOf(flow.record));

	let content = $derived(
		automation ? buildExport(format, automation, { nodes, edges }, includeLogs ? testRun : null) : ''
	);

	let name = $derived(automation ? fileName(automation, format) : 'export');

	let size = $derived(new Blob([content]).size);

	let shareUrl = $derived(automation ? `https://example.com/a/${automation.id}` : '');

	// Import: a Workflow JSON file, dropped in or pasted, opens as a new workflow
	let pasted = $state('');
	let report = $state<{ ok: boolean; title: string; problems: Problem[] } | null>(null);

	function tryImport(text: string) {
		try {
			const result = importFlow(text);

			importAutomation({ name: result.meta.name, description: result.meta.description }, result.graph);
			report = { ok: true, title: `Opened “${result.meta.name}”`, problems: result.warnings };
			pasted = '';
			toast.success(`Imported “${result.meta.name}”`, { description: `${result.graph.nodes.length} steps` });
		} catch (error) {
			report = {
				ok: false,
				title: 'This file could not be imported',
				problems: error instanceof FlowParseError ? error.problems : [{ severity: 'error', code: 'unknown', message: String(error) }]
			};
		}
	}

	async function onFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (file) tryImport(await file.text());
		input.value = '';
	}

	const download = () => {
		const url = URL.createObjectURL(
			new Blob([content], {
				type: FORMAT_META[format].mime
			})
		);
		const link = document.createElement('a');
		link.href = url;
		link.download = name;
		link.click();
		URL.revokeObjectURL(url);
		toast.success(`Downloaded ${name}`, {
			description: `${nodes.length} steps · ${formatBytes(size)}`
		});
	};
</script>

{#if automation}
	<div class="fs-minh0 fs-grow fl-export">
		<div class="fs-box fs-pt-xl fs-pb-3xl fl-export-div">
			<div class="fs-box fl-export-div-2">
				<span role="heading" aria-level={1} class="fs-weight-600 fs-text-white fl-export-heading"
					>Export</span
				>
				<span class="fs-weight-400 fl-export-span">
					Take {automation.name} anywhere: download it as JSON or Markdown, or bring a workflow in from a JSON file.
				</span>
			</div>
			<div
				class="fs-grid fs-gap-lg fl-export-div-3"
			>
				<SettingsSection
					id="export-format"
					title="Format"
					description="Pick what you want to take with you."
				>
					{#snippet icon()}
						<RowInsertIcon class="fs-text-white fl-export-row-insert-icon" />
					{/snippet}
					<div role="radiogroup" aria-label="Export format" class="fs-box fs-gap-sm">
						{#each Object.keys(FORMAT_META) as ExportFormat[] as value (value)}
							{@const meta = FORMAT_META[value]}
							{@const { Icon, theme } = FORMAT_ICONS[value]}
							{@const selected = value === format}
							<Button
								variant="bare"
								size="bare"
								role="radio"
								aria-checked={selected}
								onClick={() => (format = value)}
								className={cn(
									theme,
									'fs-ta-l fl-export-radio'
								)}
							>
								<span
									class="fs-row fs-shrink-0 fs-ycenter fs-xcenter fl-export-span-2"
								>
									<Icon aria-hidden className="fl-export-icon" />
								</span>
								<span class="fs-minw0 fs-grow fs-box">
									<span class="fs-text-white fl-export-span-4">{meta.label}</span>
									<span class="fs-weight-400 fl-export-span-5"
										>{meta.description}</span
									>
								</span>
								<span
									aria-hidden="true"
									class="fs-row fs-shrink-0 fs-ycenter fs-xcenter fs-radius-full fl-export-span-6"
								>
									<span
										class="fs-radius-full fl-export-span-7"
									></span>
								</span>
							</Button>
						{/each}
					</div>
					<SettingsRow
						title="Include latest test run"
						description={testRun
							? `${testRun.logs.length} log entries from the last run.`
							: 'Run the workflow on the Flow tab first.'}
						htmlFor="export-logs"
					>
						<Switch
							id="export-logs"
							checked={includeLogs}
							disabled={!testRun}
							onCheckedChange={setIncludeLogs}
						/>
					</SettingsRow>
					<div class="fs-row fs-wrap fs-gap-md">
						<Button variant="accent" size="field" className="fs-px-md" onClick={download}>
							<RowInsertIcon aria-hidden class="fl-export-row-insert-icon-2" />
							<span class="fs-pr-xs">Download {FORMAT_META[format].extension.toUpperCase()}</span>
						</Button>
						<Button
							variant="field"
							size="field"
							className="fs-px-md"
							onClick={() => copy(content, 'Copied to clipboard')}
						>
							Copy contents
						</Button>
					</div>
				</SettingsSection>
				<section
					aria-label="Preview"
					class="fs-minw0 fs-box fs-gap-md fs-pad-bs fl-export-preview"
				>
					<div class="fs-row fs-ycenter fs-xbetween fs-gap-md fs-px-xs">
						<span class="fs-row fs-minw0 fs-ycenter fs-gap-sm">
							<span class="fs-shrink-0 fs-radius-full fl-export-span-10"></span>
							<span class="fs-shrink-0 fs-radius-full fl-export-span-11"></span>
							<span class="fs-shrink-0 fs-radius-full fl-export-span-12"></span>
							<span class="fs-ml-sm fs-truncate fl-export-span-13"
								>{name}</span
							>
						</span>
						<Tag tone="neutral" className="fl-export-tag">{formatBytes(size)}</Tag>
					</div>
					<ExportPreview {content} {format} />
					<div
						class="fs-absolute fl-export-div-6"
					></div>
				</section>
			</div>
			<div
				class="fs-grid fs-gap-lg fl-export-div-7"
			>
				<SettingsSection
					id="export-share"
					title="Share"
					description="A read-only view of the flow canvas."
				>
					{#snippet icon()}
						<ShareIcon class="fs-text-white fl-export-share-icon" />
					{/snippet}
					<SettingsRow
						title="Public link"
						description="Anyone with the link can view — never edit — this automation."
						htmlFor="export-share-toggle"
					>
						<Switch
							id="export-share-toggle"
							checked={settings.shareLink}
							onCheckedChange={(shareLink) => updateSettings(automation.id, { shareLink })}
						/>
					</SettingsRow>
					<div
						data-disabled={!settings.shareLink || undefined}
						class="fs-row fs-gap-md fl-export-div-8"
					>
						<Input
							aria-label="Share link"
							readonly
							value={shareUrl}
							disabled={!settings.shareLink}
							className="fs-minw0 fl-export-share-link"
						/>
						<Button
							variant="field"
							size="field"
							className="fs-shrink-0 fs-px-md fl-export-button-3"
							disabled={!settings.shareLink}
							onClick={() => copy(shareUrl, 'Share link copied')}
						>
							Copy link
						</Button>
					</div>
				</SettingsSection>
				<SettingsSection
					id="export-import"
					title="Import"
					description="Open a Workflow JSON file as a new workflow."
				>
					{#snippet icon()}
						<PostsIcon class="fs-text-white fl-export-posts-icon" />
					{/snippet}
					<div class="fs-box fs-gap-md">
						<input
							type="file"
							accept="application/json,.json"
							aria-label="Choose a Workflow JSON file"
							class="fl-export-file"
							onchange={onFile}
						/>
						<textarea
							aria-label="Or paste Workflow JSON"
							placeholder="Or paste Workflow JSON here"
							rows="5"
							class="fs-px-bs fs-py-md fl-export-paste"
							bind:value={pasted}
						></textarea>
						<div class="fs-row fs-gap-md">
							<Button variant="accent" size="field" className="fs-px-md" disabled={!pasted.trim()} onClick={() => tryImport(pasted)}>
								Import
							</Button>
						</div>
						{#if report}
							<div class="fs-box fs-gap-xs fl-export-report" data-ok={report.ok || undefined} role="status">
								<strong>{report.title}</strong>
								{#each report.problems as problem, i (i)}
									<span data-severity={problem.severity}>{problem.message}</span>
								{/each}
							</div>
						{/if}
					</div>
				</SettingsSection>
			</div>
		</div>
	</div>
{/if}
