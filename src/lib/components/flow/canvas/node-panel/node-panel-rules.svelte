<script module lang="ts">
	import './node-panel-rules.css';
	import Button from '$lib/components/ui/button.svelte';
	import SelectField from '$lib/components/ui/select-field.svelte';
	import { Field, Input } from '$lib/components/ui/field.js';
	import type { ActionKind, FlowNodeData } from '$lib/stores/flow-store.svelte';
	import PlusIcon from '$lib/icons/profile/plus.svelte';
	import BackspaceIcon from '$lib/icons/flow/backspace.svelte';

	type RuleField =
		| {
				key: string;
				label: string;
				type: 'select';
				options: readonly string[];
		  }
		| {
				key: string;
				label: string;
				type: 'text' | 'time' | 'number';
				placeholder?: string;
		  }
		| {
				key: string;
				label: string;
				type: 'automation';
		  };

	type Condition = {
		field: string;
		operator: string;
		value: string;
	};

	const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	export const RULE_FIELDS: Record<Exclude<ActionKind, 'branch'>, RuleField[]> = {
		trigger: [
			{
				key: 'source',
				label: 'Signup source',
				type: 'select',
				options: ['Any source', 'Homepage form', 'Referral link', 'CSV import', 'API']
			},
			{
				key: 'tag',
				label: 'Only runs tagged',
				type: 'text',
				placeholder: 'e.g. newsletter'
			}
		],
		'send-email': [
			{
				key: 'subject',
				label: 'Subject line',
				type: 'text',
				placeholder: 'Welcome to the hive 🐝'
			},
			{
				key: 'template',
				label: 'Template',
				type: 'select',
				options: ['Welcome', 'Plain text', 'Weekly digest', 'Announcement']
			}
		],
		'update-subscription': [
			{
				key: 'action',
				label: 'Action',
				type: 'select',
				options: ['Add tag', 'Remove tag', 'Move to list', 'Unsubscribe']
			},
			{
				key: 'value',
				label: 'Tag or list',
				type: 'text',
				placeholder: 'onboarded'
			}
		],
		'send-webhook': [
			{
				key: 'method',
				label: 'Method',
				type: 'select',
				options: ['POST', 'PUT', 'PATCH']
			},
			{
				key: 'url',
				label: 'Endpoint URL',
				type: 'text',
				placeholder: 'https://hooks.example.com/notify'
			}
		],
		'wait-until': [
			{
				key: 'day',
				label: 'Day',
				type: 'select',
				options: DAYS
			},
			{
				key: 'time',
				label: 'Time',
				type: 'time'
			}
		],
		'time-delay': [
			{
				key: 'amount',
				label: 'Wait for',
				type: 'number',
				placeholder: '2'
			},
			{
				key: 'unit',
				label: 'Unit',
				type: 'select',
				options: ['minutes', 'hours', 'days', 'weeks']
			}
		],
		agent: [
			{ key: 'model', label: 'Model', type: 'select', options: ['Jev (classifier)', 'Sol (planner)', 'Terra (planner)', 'Luna (worker)'] },
			{ key: 'prompt', label: 'Instruction', type: 'text', placeholder: 'What should the model do?' }
		],
		transform: [
			{ key: 'from', label: 'From', type: 'select', options: ['JSON', 'CSV', 'HTML', 'Markdown', 'Text'] },
			{ key: 'to', label: 'To', type: 'select', options: ['Markdown', 'JSON', 'CSV', 'HTML', 'Text'] }
		],
		read: [
			{ key: 'source', label: 'Source', type: 'text', placeholder: 'path, URL or record' }
		],
		write: [
			{ key: 'target', label: 'Destination', type: 'text', placeholder: 'path, page or store' }
		],
		review: [
			{ key: 'check', label: 'Check', type: 'select', options: ['Schema valid', 'Tests pass', 'Human approves', 'Score above threshold'] }
		],
		enroll: [
			{
				key: 'automation',
				label: 'Automation',
				type: 'automation'
			}
		]
	};

	const RULE_DEFAULTS: Record<string, string> = {
		source: 'Any source',
		template: 'Welcome',
		action: 'Add tag',
		method: 'POST',
		day: 'Monday',
		time: '09:00',
		amount: '2',
		unit: 'days'
	};

	const CONDITION_FIELDS = [
		'Opened Email 1',
		'Clicked any link',
		'Has tag',
		'Signup source',
		'Country'
	];

	const OPERATORS = ['is', 'is not'];

	function formatTime(value: string) {
		const [hours = '9', minutes = '00'] = value.split(':');
		const hour = Number(hours);
		const suffix = hour >= 12 ? 'PM' : 'AM';
		return `${hour % 12 || 12}:${minutes} ${suffix}`;
	}

	function parseConditions(node: FlowNodeData): Condition[] {
		try {
			return JSON.parse(node.rules?.conditions ?? '[]') as Condition[];
		} catch {
			return [];
		}
	}

	export function deriveNode(node: FlowNodeData, rules: Record<string, string>) {
		const value = (key: string) => rules[key] ?? RULE_DEFAULTS[key] ?? '';
		switch (node.kind) {
			case 'wait-until':
				return {
					title: `${value('day')} at ${formatTime(value('time'))}`
				};
			case 'time-delay': {
				const amount = Number(value('amount')) || 1;
				const unit = value('unit');
				return {
					title: `Wait ${amount} ${amount === 1 ? unit.replace(/s$/, '') : unit}`
				};
			}
			case 'enroll':
				return rules.automation
					? {
							title: rules.automation
						}
					: {};
			case 'branch': {
				const conditions = JSON.parse(rules.conditions ?? '[]') as Condition[];
				const first = conditions[0];
				return {
					title: `Branch on ${conditions.length} condition${conditions.length === 1 ? '' : 's'}`,
					description: first
						? conditions
								.map((item) => `${item.field} ${item.operator === 'is' ? '=' : '≠'} ${item.value}`)
								.join(' and ')
						: 'Need to add a condition, e.g., Opened Email 1 = True'
				};
			}
			default:
				return {};
		}
	}

	type NodePanelRulesProps = {
		node: FlowNodeData;
		onChange: (rules: Record<string, string>) => void;
	};
</script>

<script lang="ts">
	import { app } from '$lib/stores/app-store.svelte';

	let { node, onChange }: NodePanelRulesProps = $props();

	const automations = $derived(app.automations);

	let rules = $derived(node.rules ?? {});

	const set = (key: string, value: string) =>
		onChange({
			...rules,
			[key]: value
		});

	let fields = $derived(node.kind === 'branch' ? [] : RULE_FIELDS[node.kind]);
</script>

{#if node.kind === 'branch'}
	{@const conditions = parseConditions(node)}
	{@const write = (next: Condition[]) => onChange({ ...rules, conditions: JSON.stringify(next) })}
	<div class="fs-box fs-gap-sm">
		{#each conditions as condition, index (index)}
			<div class="fs-grid fs-gap-sm fl-node-panel-rules-div">
				<SelectField
					value={condition.field}
					options={CONDITION_FIELDS}
					onChange={(field) =>
						write(conditions.map((item, at) => (at === index ? { ...item, field } : item)))}
				/>
				<SelectField
					value={condition.operator}
					options={OPERATORS}
					onChange={(operator) =>
						write(conditions.map((item, at) => (at === index ? { ...item, operator } : item)))}
				/>
				<Input
					aria-label="Condition value"
					value={condition.value}
					onChange={(event) =>
						write(
							conditions.map((item, at) =>
								at === index ? { ...item, value: event.target.value } : item
							)
						)}
				/>
				<Button
					variant="brick"
					size="icon-lg"
					aria-label="Remove condition"
					onClick={() => write(conditions.filter((_, at) => at !== index))}
				>
					<BackspaceIcon aria-hidden class="fl-node-panel-rules-backspace-icon" />
				</Button>
			</div>
		{/each}
		<Button
			variant="field"
			size="field"
			className="fl-node-panel-rules-button"
			onClick={() =>
				write([...conditions, { field: 'Opened Email 1', operator: 'is', value: 'True' }])}
		>
			<span class="fs-row fs-ycenter fs-xcenter fl-node-panel-rules-span"
				><PlusIcon aria-hidden class="fl-node-panel-rules-plus-icon" /></span
			>
			<span class="fs-pr-xs">Add condition</span>
		</Button>
	</div>
{:else}
	<div class="fs-grid fs-cgap-md fs-rgap-md fl-node-panel-rules-div-2">
		{#each fields as field (field.key)}
			{@const id = `${node.id}-${field.key}`}
			{@const value = rules[field.key] ?? RULE_DEFAULTS[field.key] ?? ''}
			{@const wide = field.type === 'text' || field.type === 'automation'}
			<Field label={field.label} htmlFor={id} className={wide ? 'fl-node-panel-rules-field' : undefined}>
				{#if field.type === 'select'}
					<SelectField
						{id}
						{value}
						options={field.options}
						onChange={(next) => set(field.key, next)}
					/>
				{:else if field.type === 'automation'}
					<SelectField
						{id}
						value={value || automations[1]?.name || ''}
						options={automations.map((automation) => automation.name)}
						onChange={(next) => set(field.key, next)}
					/>
				{:else}
					<Input
						{id}
						type={field.type}
						min={field.type === 'number' ? 1 : undefined}
						placeholder={field.placeholder}
						{value}
						onChange={(event) => set(field.key, event.target.value)}
						className="fl-node-panel-rules-input"
					/>
				{/if}
			</Field>
		{/each}
	</div>
{/if}
