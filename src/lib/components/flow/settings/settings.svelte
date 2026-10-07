<script module lang="ts">
	import './settings.css';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import SegmentedTabs from '$lib/components/ui/segmented-tabs.svelte';
	import SelectField from '$lib/components/ui/select-field.svelte';
	import { Field, Input, Textarea } from '$lib/components/ui/field.js';
	import Switch from '$lib/components/ui/shadcn/switch.svelte';
	import { cn } from '$lib/utils/utils.js';
	import type { AutomationStatus } from '$lib/data/automations.js';
	import BoltIcon from '$lib/icons/automations/bolt.svelte';
	import MailIcon from '$lib/icons/overview/mail.svelte';
	import UserIcon from '$lib/icons/overview/user.svelte';
	import DangerIcon from '$lib/icons/profile/logout.svelte';
	import SettingsSection from './settings-section.svelte';
import SettingsRow from './SettingsRow.svelte';

	const STATUS_ITEMS: {
		value: AutomationStatus;
		label: string;
	}[] = [
		{
			value: 'draft',
			label: 'Draft'
		},
		{
			value: 'running',
			label: 'Running'
		},
		{
			value: 'paused',
			label: 'Paused'
		}
	];

	const TIMEZONES = [
		'Workspace timezone',
		'Europe/Lisbon (GMT+1)',
		'America/New_York (GMT-4)',
		'Asia/Kolkata (GMT+5:30)',
		'Australia/Sydney (GMT+10)'
	];
</script>

<script lang="ts">
	import {
		app,
		DEFAULT_SETTINGS,
		deleteAutomation,
		duplicateAutomation,
		updateAutomation,
		updateSettings
	} from '$lib/stores/app-store.svelte';

	const automation = $derived(app.automations.find((item) => item.id === app.automationId));

	const settings = $derived(app.settings[app.automationId] ?? DEFAULT_SETTINGS);

	let confirming = $state(false);

	$effect(() => {
		if (!confirming) return;
		const timer = window.setTimeout(() => (confirming = false), 4000);
		return () => window.clearTimeout(timer);
	});

	const set = (patch: Partial<typeof settings>) => {
		if (!automation) return;
		updateSettings(automation.id, patch);
	};
</script>

{#if automation}
	<div class="fs-minh0 fs-grow fl-settings">
		<div class="fs-box fs-pt-xl fs-pb-3xl fl-settings-div">
			<div class="fs-row fs-wrap fs-ybot fs-xbetween fs-gap-bs">
				<div class="fs-box fl-settings-div-3">
					<span role="heading" aria-level={1} class="fs-weight-600 fs-text-white fl-settings-heading"
						>Settings</span
					>
					<span class="fs-weight-400 fl-settings-span">
						Control how {automation.name} sends, who can enter it and when it stops.
					</span>
				</div>
				<span class="fs-row fs-ycenter fs-gap-sm fs-weight-500 fl-settings-span-2">
					<span class="fs-radius-full fl-settings-span-3"
					></span>Changes save automatically
				</span>
			</div>
			<div class="fs-minw0 fs-box fs-gap-lg">
				<SettingsSection
					id="settings-general"
					title="General"
					description="Name, purpose and whether this automation is live."
				>
					{#snippet icon()}
						<BoltIcon class="fs-text-white fl-settings-bolt-icon" />
					{/snippet}
					<div class="fs-grid fl-settings-div-5">
						<Field label="Automation name" htmlFor="settings-name">
							<Input
								id="settings-name"
								value={automation.name}
								onChange={(event) => updateAutomation(automation.id, { name: event.target.value })}
							/>
						</Field>
						<Field
							label="Goal"
							htmlFor="settings-goal"
							hint="Used to measure conversion on the Overview tab."
						>
							<Input
								id="settings-goal"
								value={settings.goal}
								onChange={(event) => set({ goal: event.target.value })}
							/>
						</Field>
					</div>
					<Field label="Description" htmlFor="settings-description">
						<Textarea
							id="settings-description"
							className="fl-settings-settings-description"
							value={automation.description}
							onChange={(event) =>
								updateAutomation(automation.id, { description: event.target.value })}
						/>
					</Field>
					<Field label="Status">
						<SegmentedTabs
							label="Automation status"
							items={STATUS_ITEMS}
							value={automation.status}
							onChange={(status) => {
								updateAutomation(automation.id, { status });
								toast.success(
									status === 'running'
										? 'Automation is live'
										: status === 'paused'
											? 'Automation paused'
											: 'Moved back to draft',
									{
										description:
											status === 'running'
												? 'New runs will start from the next trigger.'
												: 'No one new will enter until you resume it.'
									}
								);
							}}
						/>
					</Field>
				</SettingsSection>
				<SettingsSection
					id="settings-sending"
					title="Sending"
					description="Who emails come from and when they are allowed to go out."
				>
					{#snippet icon()}
						<MailIcon class="fs-text-white fl-settings-mail-icon" />
					{/snippet}
					<div class="fs-grid fl-settings-div-6">
						<Field label="Sender name" htmlFor="settings-sender">
							<Input
								id="settings-sender"
								value={settings.senderName}
								onChange={(event) => set({ senderName: event.target.value })}
							/>
						</Field>
						<Field label="Reply-to address" htmlFor="settings-reply">
							<Input
								id="settings-reply"
								type="email"
								value={settings.replyTo}
								onChange={(event) => set({ replyTo: event.target.value })}
							/>
						</Field>
					</div>
					<Field label="Send using">
						<SelectField
							value={settings.timezone}
							options={TIMEZONES}
							onChange={(timezone) => set({ timezone })}
						/>
					</Field>
					<SettingsRow
						title="Quiet hours"
						description="Hold emails that would land overnight and send them in the morning."
						htmlFor="settings-quiet"
					>
						<Switch
							id="settings-quiet"
							checked={settings.quietHours}
							onCheckedChange={(quietHours) => set({ quietHours })}
						/>
					</SettingsRow>
					<div
						data-disabled={!settings.quietHours || undefined}
						class="fs-grid fl-settings-div-7"
					>
						<Field label="Hold from" htmlFor="settings-quiet-from">
							<Input
								id="settings-quiet-from"
								type="time"
								disabled={!settings.quietHours}
								value={settings.quietFrom}
								onChange={(event) => set({ quietFrom: event.target.value })}
								className="fl-settings-settings-quiet-from"
							/>
						</Field>
						<Field label="Until" htmlFor="settings-quiet-to">
							<Input
								id="settings-quiet-to"
								type="time"
								disabled={!settings.quietHours}
								value={settings.quietTo}
								onChange={(event) => set({ quietTo: event.target.value })}
								className="fl-settings-settings-quiet-to"
							/>
						</Field>
					</div>
					<SettingsRow
						title="Skip weekends"
						description="Delays and waits pause on Saturday and Sunday."
						htmlFor="settings-weekends"
					>
						<Switch
							id="settings-weekends"
							checked={settings.skipWeekends}
							onCheckedChange={(skipWeekends) => set({ skipWeekends })}
						/>
					</SettingsRow>
				</SettingsSection>
				<SettingsSection
					id="settings-enrollment"
					title="Enrollment"
					description="Rules for entering and leaving this automation."
				>
					{#snippet icon()}
						<UserIcon class="fs-text-white fl-settings-user-icon" />
					{/snippet}
					{#snippet action()}
						<span
							class="fs-weight-500 fl-settings-span-4"
						>
							<span class="fs-text-white">{automation.started}</span> started ·
							<span class="fs-text-white">{automation.finished}</span> completed
						</span>
					{/snippet}
					<SettingsRow
						title="Allow re-entry"
						description="A run can start again after it finishes."
						htmlFor="settings-reentry"
					>
						<Switch
							id="settings-reentry"
							checked={settings.reentry}
							onCheckedChange={(reentry) => set({ reentry })}
						/>
					</SettingsRow>
					<SettingsRow
						title="Exit on unsubscribe"
						description="Remove people from every step as soon as they unsubscribe."
						htmlFor="settings-exit"
					>
						<Switch
							id="settings-exit"
							checked={settings.exitOnUnsubscribe}
							onCheckedChange={(exitOnUnsubscribe) => set({ exitOnUnsubscribe })}
						/>
					</SettingsRow>
				</SettingsSection>
				<SettingsSection
					id="settings-danger"
					title="Danger zone"
					description="Copy this automation or remove it for good."
					tone="danger"
				>
					{#snippet icon()}
						<DangerIcon class="fl-settings-danger-icon" />
					{/snippet}
					<SettingsRow
						title="Duplicate automation"
						description="Creates a draft copy with the same steps and settings."
					>
						<Button
							variant="field"
							size="field"
							className="fs-px-md"
							onClick={() => duplicateAutomation(automation.id)}
						>
							Duplicate
						</Button>
					</SettingsRow>
					<SettingsRow
						title="Delete automation"
						description="Stops it immediately and removes its history. This can’t be undone."
					>
						<Button
							variant="field"
							size="field"
							aria-live="polite"
							onClick={() => {
								if (!confirming) {
									confirming = true;
									return;
								}
								const name = automation.name;
								deleteAutomation(automation.id);
								toast(`Deleted “${name}”`);
							}}
							className={cn(
								'fs-px-md fl-settings-button-2',
								confirming && 'fl-settings-button-2-1'
							)}
						>
							{confirming ? 'Click again to delete' : 'Delete'}
						</Button>
					</SettingsRow>
				</SettingsSection>
			</div>
		</div>
	</div>
{/if}
