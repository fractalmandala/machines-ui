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
	import UsersIcon from '$lib/icons/flow/users-plus.svelte';
	import LayoutIcon from '$lib/icons/flow/layout.svelte';
	import RowInsertIcon from '$lib/icons/flow/row-insert.svelte';
	import ShareIcon from '$lib/icons/topbar/share.svelte';
	import PostsIcon from '$lib/icons/overview/posts.svelte';
	import SettingsSection from '../settings/settings-section.svelte';
import SettingsRow from '../settings/SettingsRow.svelte';
	import ExportPreview from './export-preview.svelte';
	import { FORMAT_META, buildExport, fileName, type ExportFormat } from './export-formats.js';

	const FORMAT_ICONS = {
		json: {
			Icon: WebhookIcon,
			theme: 'fl-export-theme-json'
		},
		csv: {
			Icon: UsersIcon,
			theme: 'fl-export-theme-csv'
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
	import { app, DEFAULT_SETTINGS, updateSettings } from '$lib/stores/app-store.svelte';
	import { flow } from '$lib/stores/flow-store.svelte';

	const automation = $derived(app.automations.find((item) => item.id === app.automationId));

	const settings = $derived(app.settings[app.automationId] ?? DEFAULT_SETTINGS);

	const nodes = $derived(flow.nodes);

	const edges = $derived(flow.edges);

	const logs = $derived(flow.logs);

	let format = $state<ExportFormat>('json');

	let includeRules = $state(true);
	function setIncludeRules(value: StateInput<boolean>) {
		includeRules = resolveState(includeRules, value);
	}

	let includeLogs = $state(false);
	function setIncludeLogs(value: StateInput<boolean>) {
		includeLogs = resolveState(includeLogs, value);
	}

	let content = $derived(
		automation
			? buildExport(format, automation, { nodes, edges }, logs, { includeRules, includeLogs })
			: ''
	);

	let name = $derived(automation ? fileName(automation, format) : 'export');

	let size = $derived(new Blob([content]).size);

	let shareUrl = $derived(automation ? `https://example.com/a/${automation.id}` : '');

	let curl = $derived(
		automation
			? `curl -X POST https://api.example.com/v1/automations/${automation.id}/enroll \\\n  -H "Authorization: Bearer $API_KEY" \\\n  -d '{ "email": "reader@example.com" }'`
			: ''
	);

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
					Take {automation.name} anywhere — download the flow, share a read-only link or trigger it
					from your own code.
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
						title="Include step rules"
						description="Conditions, subjects and timings you set in the step panel."
						htmlFor="export-rules"
					>
						<Switch
							id="export-rules"
							checked={includeRules}
							disabled={format !== 'json'}
							onCheckedChange={setIncludeRules}
						/>
					</SettingsRow>
					<SettingsRow
						title="Include latest test run"
						description={logs.length
							? `${logs.length} log entries from Run once.`
							: 'Use Run once on the Flow tab first.'}
						htmlFor="export-logs"
					>
						<Switch
							id="export-logs"
							checked={includeLogs}
							disabled={!logs.length || format === 'csv'}
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
					id="export-api"
					title="Trigger from your code"
					description="Start a run with a single request."
				>
					{#snippet icon()}
						<PostsIcon class="fs-text-white fl-export-posts-icon" />
					{/snippet}
					{#snippet action()}
						<Button
							variant="field"
							size="field"
							className="fs-px-md"
							onClick={() => copy(curl, 'cURL command copied')}
						>
							Copy
						</Button>
					{/snippet}
					<pre
						class="fs-px-bs fs-py-md fl-export-pre">
						<code>
							<span class="fl-export-span-14">curl</span>
							{curl.slice(4)}
						</code>
					</pre>
				</SettingsSection>
			</div>
		</div>
	</div>
{/if}
