<script module lang="ts">
	import './node-panel-rules.css';
	import Button from '$lib/components/ui/button.svelte';
	import SelectField from '$lib/components/ui/select-field.svelte';
	import { Field, Input } from '$lib/components/ui/field.js';
	import { FORMATS, OPERATORS, describe, parseConditions, type Condition, type ConditionSet, type Operator } from '$lib/engine/index.js';
	import type { ActionKind, FlowNodeData } from '$lib/stores/flow-store.svelte';
	import PlusIcon from '$lib/icons/profile/plus.svelte';
	import BackspaceIcon from '$lib/icons/flow/backspace.svelte';

	/** A field shows only while another rule has a given value: the schema while the check is "Schema valid". */
	type When = { key: string; value: string };

	type RuleField = (
		| { key: string; label: string; type: 'select'; options: readonly string[]; /** Shown words for stored values. */ labels?: Record<string, string> }
		| { key: string; label: string; type: 'text' | 'time' | 'number'; placeholder?: string }
		| { key: string; label: string; type: 'json'; placeholder?: string }
		| { key: string; label: string; type: 'automation' }
	) & { when?: When };

	const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

	/** What a step answers with when a simulation runs it: the JSON a stand-in returns. */
	const SAMPLE: RuleField = { key: 'sampleOutput', label: 'Sample output', type: 'json', placeholder: '{ "text": "…" }' };

	/** What happens when a step fails. Stored as `stop`, `continue` or `retry`. */
	const FAILURE: RuleField[] = [
		{ key: 'onError', label: 'If this step fails', type: 'select', options: ['stop', 'continue', 'retry'], labels: { stop: 'Stop the run', continue: 'Carry on anyway', retry: 'Try again' } },
		{ key: 'attempts', label: 'Tries', type: 'number', placeholder: '3', when: { key: 'onError', value: 'retry' } }
	];

	const FIELDS: Record<Exclude<ActionKind, 'branch'>, RuleField[]> = {
		trigger: [{ key: 'sampleOutput', label: 'Sample payload', type: 'json', placeholder: '{ "prompt": "…" }' }],
		'send-email': [
			{ key: 'subject', label: 'Subject line', type: 'text', placeholder: 'Your weekly report' },
			{ key: 'template', label: 'Template', type: 'select', options: ['Welcome', 'Plain text', 'Weekly digest', 'Announcement'] },
			SAMPLE
		],
		'update-record': [
			{ key: 'action', label: 'Action', type: 'select', options: ['Add tag', 'Remove tag', 'Move to list', 'Unsubscribe'] },
			{ key: 'value', label: 'Tag or list', type: 'text', placeholder: 'triaged' },
			SAMPLE
		],
		'send-webhook': [
			{ key: 'method', label: 'Method', type: 'select', options: ['POST', 'PUT', 'PATCH'] },
			{ key: 'url', label: 'Endpoint URL', type: 'text', placeholder: 'https://hooks.example.com/notify' },
			SAMPLE
		],
		'wait-until': [
			{ key: 'day', label: 'Day', type: 'select', options: DAYS },
			{ key: 'time', label: 'Time', type: 'time' }
		],
		'time-delay': [
			{ key: 'amount', label: 'Wait for', type: 'number', placeholder: '2' },
			{ key: 'unit', label: 'Unit', type: 'select', options: ['minutes', 'hours', 'days', 'weeks'] }
		],
		'run-workflow': [{ key: 'automation', label: 'Workflow', type: 'automation' }, SAMPLE],
		agent: [
			{ key: 'model', label: 'Model', type: 'select', options: ['Jev (classifier)', 'Sol (planner)', 'Terra (planner)', 'Luna (worker)'] },
			{ key: 'prompt', label: 'Instruction', type: 'text', placeholder: 'What should the model do?' },
			SAMPLE
		],
		transform: [
			{ key: 'from', label: 'From', type: 'select', options: FORMATS },
			{ key: 'to', label: 'To', type: 'select', options: [...FORMATS].sort((a, b) => (a === 'Markdown' ? -1 : b === 'Markdown' ? 1 : 0)) }
		],
		read: [{ key: 'source', label: 'Source', type: 'text', placeholder: 'path, URL or record' }, SAMPLE],
		write: [{ key: 'target', label: 'Destination', type: 'text', placeholder: 'path, page or store' }, SAMPLE],
		review: [
			{ key: 'check', label: 'Check', type: 'select', options: ['Schema valid', 'Tests pass', 'Human approves', 'Score above threshold'] },
			{ key: 'schema', label: 'Schema (JSON)', type: 'json', placeholder: '{ "type": "object", "required": ["page"] }', when: { key: 'check', value: 'Schema valid' } },
			{ key: 'path', label: 'Score at', type: 'text', placeholder: 'translate-es.score', when: { key: 'check', value: 'Score above threshold' } },
			{ key: 'threshold', label: 'Above', type: 'text', placeholder: '0.8', when: { key: 'check', value: 'Score above threshold' } },
			{ key: 'sampleOutput', label: 'Sample result', type: 'json', placeholder: '{ "pass": true }', when: { key: 'check', value: 'Tests pass' } }
		]
	};

	export const RULE_FIELDS: Record<Exclude<ActionKind, 'branch'>, RuleField[]> = Object.fromEntries(
		Object.entries(FIELDS).map(([kind, fields]) => [kind, kind === 'trigger' ? fields : [...fields, ...FAILURE]])
	) as Record<Exclude<ActionKind, 'branch'>, RuleField[]>;

	const RULE_DEFAULTS: Record<string, string> = {
		template: 'Welcome',
		action: 'Add tag',
		method: 'POST',
		day: 'Monday',
		time: '09:00',
		amount: '2',
		unit: 'days',
		model: 'Luna (worker)',
		from: 'JSON',
		to: 'Markdown',
		check: 'Schema valid',
		onError: 'stop'
	};

	function formatTime(value: string) {
		const [hours = '9', minutes = '00'] = value.split(':');
		const hour = Number(hours);
		const suffix = hour >= 12 ? 'PM' : 'AM';
		return `${hour % 12 || 12}:${minutes} ${suffix}`;
	}

	/** What a change to a step's rules does to its title and description. */
	export function deriveNode(node: FlowNodeData, rules: Record<string, string>) {
		const value = (key: string) => rules[key] ?? RULE_DEFAULTS[key] ?? '';
		switch (node.kind) {
			case 'wait-until':
				return { title: `${value('day')} at ${formatTime(value('time'))}` };
			case 'time-delay': {
				const amount = Number(value('amount')) || 1;
				const unit = value('unit');
				return { title: `Wait ${amount} ${amount === 1 ? unit.replace(/s$/, '') : unit}` };
			}
			case 'run-workflow':
				return rules.automation ? { title: rules.automation } : {};
			case 'branch': {
				const set = parseConditions(rules.conditions);

				return { description: set.items.length ? describe(set) : 'Add a condition, for example score >= 0.5' };
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
	import { flow } from '$lib/stores/flow-store.svelte';

	let { node, onChange }: NodePanelRulesProps = $props();

	const automations = $derived(app.automations);

	let rules = $derived(node.rules ?? {});

	const set = (key: string, value: string) => onChange({ ...rules, [key]: value });

	const shown = (field: RuleField) => !field.when || (rules[field.when.key] ?? RULE_DEFAULTS[field.when.key] ?? '') === field.when.value;

	let fields = $derived(node.kind === 'branch' ? [] : RULE_FIELDS[node.kind].filter(shown));

	// a branch tests values the steps before it answered with: offer `step-id.key` for each key of a sample output
	const paths = $derived.by(() => {
		const out = ['trigger'];

		for (const other of flow.nodes) {
			if (other.id === node.id) continue;

			try {
				const sample = JSON.parse(other.rules?.sampleOutput ?? 'null') as unknown;

				if (sample && typeof sample === 'object' && !Array.isArray(sample)) for (const key of Object.keys(sample)) out.push(`${other.id}.${key}`);
			} catch {
				/* a sample that is not JSON offers nothing */
			}
		}

		return [...new Set(out.map((p) => (p === 'trigger' ? 'trigger.' : p)))];
	});

	const listId = $derived(`${node.id}-paths`);
</script>

{#if node.kind === 'branch'}
	{@const conditions = parseConditions(rules.conditions)}
	{@const write = (next: ConditionSet) => onChange({ ...rules, conditions: JSON.stringify(next) })}
	{@const edit = (index: number, patch: Partial<Condition>) => write({ ...conditions, items: conditions.items.map((item, at) => (at === index ? { ...item, ...patch } : item)) })}
	<div class="fs-box fs-gap-sm">
		<datalist id={listId}>
			{#each paths as path (path)}<option value={path}></option>{/each}
		</datalist>
		{#if conditions.items.length > 1}
			<SelectField
				value={conditions.combine === 'any' ? 'any of these' : 'all of these'}
				options={['all of these', 'any of these']}
				onChange={(next) => write({ ...conditions, combine: next === 'any of these' ? 'any' : 'all' })}
			/>
		{/if}
		{#each conditions.items as condition, index (index)}
			<div class="fs-grid fs-gap-sm fl-node-panel-rules-div">
				<Input aria-label="Value to test" placeholder="step-id.key" list={listId} value={condition.path} onChange={(event) => edit(index, { path: event.target.value })} />
				<SelectField value={condition.operator} options={[...OPERATORS]} onChange={(operator) => edit(index, { operator: operator as Operator })} />
				<Input aria-label="Condition value" placeholder={condition.operator === 'exists' ? '' : 'value'} disabled={condition.operator === 'exists'} value={condition.value ?? ''} onChange={(event) => edit(index, { value: event.target.value })} />
				<Button variant="brick" size="icon-lg" aria-label="Remove condition" onClick={() => write({ ...conditions, items: conditions.items.filter((_, at) => at !== index) })}>
					<BackspaceIcon aria-hidden class="fl-node-panel-rules-backspace-icon" />
				</Button>
			</div>
		{/each}
		<Button variant="field" size="field" className="fl-node-panel-rules-button" onClick={() => write({ ...conditions, items: [...conditions.items, { path: paths.find((p) => p.includes('.') && !p.endsWith('.')) ?? 'trigger.', operator: 'is', value: '' }] })}>
			<span class="fs-row fs-ycenter fs-xcenter fl-node-panel-rules-span"><PlusIcon aria-hidden class="fl-node-panel-rules-plus-icon" /></span>
			<span class="fs-pr-xs">Add condition</span>
		</Button>
		<span class="fl-node-panel-rules-hint">Takes TRUE when {conditions.combine === 'any' ? 'any' : 'all'} of these hold, FALSE otherwise. With none set it takes TRUE.</span>
	</div>
{:else}
	<div class="fs-grid fs-cgap-md fs-rgap-md fl-node-panel-rules-div-2">
		{#each fields as field (field.key)}
			{@const id = `${node.id}-${field.key}`}
			{@const value = rules[field.key] ?? RULE_DEFAULTS[field.key] ?? ''}
			{@const wide = field.type === 'text' || field.type === 'automation' || field.type === 'json'}
			<Field label={field.label} htmlFor={id} className={wide ? 'fl-node-panel-rules-field' : undefined}>
				{#if field.type === 'select'}
					{@const labels = field.labels}
					<SelectField
						{id}
						value={labels?.[value] ?? value}
						options={labels ? field.options.map((o) => labels[o]) : field.options}
						onChange={(next) => set(field.key, labels ? (field.options.find((o) => labels[o] === next) ?? next) : next)}
					/>
				{:else if field.type === 'automation'}
					<SelectField {id} value={value || automations[1]?.name || ''} options={automations.map((automation) => automation.name)} onChange={(next) => set(field.key, next)} />
				{:else if field.type === 'json'}
					{@const bad = value.trim() !== '' && (() => { try { JSON.parse(value); return false; } catch { return true; } })()}
					<textarea {id} rows="4" spellcheck="false" aria-invalid={bad} class="fl-node-panel-rules-json" placeholder={field.placeholder} {value} onchange={(event) => set(field.key, event.currentTarget.value)}></textarea>
					{#if bad}<span class="fl-node-panel-rules-hint" data-invalid>Not valid JSON: a run treats it as plain text.</span>{/if}
				{:else}
					<Input {id} type={field.type} min={field.type === 'number' ? 1 : undefined} placeholder={field.placeholder} {value} onChange={(event) => set(field.key, event.target.value)} className="fl-node-panel-rules-input" />
				{/if}
			</Field>
		{/each}
	</div>
{/if}
