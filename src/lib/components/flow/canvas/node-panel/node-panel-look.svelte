<script module lang="ts">
	import './node-panel-look.css';
	import { Field, Input } from '$lib/components/ui/field.js';
	import Button from '$lib/components/ui/button.svelte';
	import SelectField from '$lib/components/ui/select-field.svelte';
	import { EASINGS } from '$lib/components/frame/motion.js';
	import {
		ACCENTS,
		BADGES,
		CORNERS,
		DASHES,
		LOOKS,
		MOTIONS,
		PADS,
		STATUSES,
		STATUS_LABELS,
		type Dash,
		type Look,
		type Motion,
		type Pad,
		type Status
	} from '$lib/core/values.js';
	import type { NodeView, FlowNodeData } from '$lib/stores/flow-store.svelte';

	type NodePanelLookProps = {
		node: FlowNodeData;
	};

	const AUTO = 'auto';
	const NONE = 'none';
	const STATUS_WORDS = [...new Set(Object.values(STATUS_LABELS).filter(Boolean))];
	const EASING_NAMES = Object.keys(EASINGS);
	const ON_OFF = ['auto', 'on', 'off'] as const;
</script>

<script lang="ts">
	import { checkpoint, updateView } from '$lib/stores/flow-store.svelte';

	let { node }: NodePanelLookProps = $props();

	const view = $derived<NodeView>(node.view ?? {});

	// every change is one undo step, and a field left at its default is removed from the node
	function set(patch: Partial<NodeView>) {
		checkpoint();
		updateView(node.id, patch);
	}

	const statusText = $derived(
		view.statusLabel === false ? NONE : (view.statusLabel ?? AUTO)
	);
	const badge = $derived(view.badge === '' ? NONE : (view.badge ?? AUTO));
	const customStatus = $derived(
		typeof view.statusLabel === 'string' && !STATUS_WORDS.includes(view.statusLabel) ? view.statusLabel : ''
	);
	const customBadge = $derived(
		view.badge && !(BADGES as readonly string[]).includes(view.badge) ? view.badge : ''
	);
</script>

<div class="fs-box fs-gap-bs">
	<Field label="Drawn as">
		<SelectField
			value={view.look ?? 'card'}
			options={LOOKS}
			onChange={(value) => set({ look: value as Look })}
		/>
	</Field>
	<Field label="Status">
		<SelectField
			value={view.status ?? AUTO}
			options={[AUTO, ...STATUSES]}
			onChange={(value) => set({ status: value === AUTO ? undefined : (value as Status) })}
		/>
	</Field>
	<Field label="Status text">
		<SelectField
			value={statusText}
			options={[AUTO, NONE, ...STATUS_WORDS]}
			onChange={(value) =>
				set({ statusLabel: value === AUTO ? undefined : value === NONE ? false : value })}
		/>
		<Input
			placeholder="or type your own"
			value={customStatus}
			onFocus={checkpoint}
			onChange={(event) => updateView(node.id, { statusLabel: event.target.value || undefined })}
		/>
	</Field>
	<Field label="Badge">
		<SelectField
			value={badge}
			options={[AUTO, NONE, ...BADGES]}
			onChange={(value) => set({ badge: value === AUTO ? undefined : value === NONE ? '' : value })}
		/>
		<Input
			placeholder="or type your own"
			value={customBadge}
			onFocus={checkpoint}
			onChange={(event) => updateView(node.id, { badge: event.target.value || undefined })}
		/>
	</Field>
	<Field label="Pad">
		<SelectField
			value={view.pad ?? 'md'}
			options={PADS}
			onChange={(value) => set({ pad: value as Pad })}
		/>
	</Field>
	<Field label="Accent">
		<div class="fl-node-panel-look-swatches">
			<Button
				variant="field"
				size="xs"
				onClick={() => set({ accent: undefined })}
			>
				auto
			</Button>
			{#each ACCENTS as tone (tone.id)}
				<button
					type="button"
					class="fl-node-panel-look-swatch"
					style:--swatch={tone.value}
					title={tone.name}
					aria-label={tone.name}
					aria-pressed={view.accent === tone.value}
					onclick={() => set({ accent: tone.value })}
				></button>
			{/each}
			<Input
				type="color"
				className="fl-node-panel-look-color"
				aria-label="Custom accent colour"
				value={view.accent?.startsWith('#') ? view.accent : ACCENTS[0].value}
				onFocus={checkpoint}
				onChange={(event) => updateView(node.id, { accent: event.target.value })}
			/>
		</div>
	</Field>

	{#if view.look === 'frame'}
		<!-- the frame look's own props; a card takes none of them -->
		<Field label="Dash">
			<SelectField
				value={view.dash ?? 'token'}
				options={DASHES}
				onChange={(value) => set({ dash: value as Dash })}
			/>
		</Field>
		<Field label="Motion">
			<SelectField
				value={view.motion ?? AUTO}
				options={[AUTO, ...MOTIONS]}
				onChange={(value) => set({ motion: value === AUTO ? undefined : (value as Motion) })}
			/>
		</Field>
		<Field label="Speed" hint="Seconds per cycle. Empty follows the motion.">
			<Input
				type="number"
				min="0.2"
				max="4"
				step="0.1"
				placeholder="auto"
				value={view.speed ?? ''}
				onFocus={checkpoint}
				onChange={(event) =>
					updateView(node.id, { speed: event.target.value === '' ? undefined : Number(event.target.value) })}
			/>
		</Field>
		<Field label="Easing">
			<SelectField
				value={view.easing ?? AUTO}
				options={[AUTO, ...EASING_NAMES]}
				onChange={(value) => set({ easing: value === AUTO ? undefined : value })}
			/>
		</Field>
		<Field label="Corner">
			<SelectField
				value={view.corner ?? AUTO}
				options={[AUTO, ...CORNERS]}
				onChange={(value) => set({ corner: value === AUTO ? undefined : value })}
			/>
		</Field>
		<Field label="Corner blink">
			<SelectField
				value={view.cornerBlink === undefined ? AUTO : view.cornerBlink ? 'on' : 'off'}
				options={ON_OFF}
				onChange={(value) => set({ cornerBlink: value === AUTO ? undefined : value === 'on' })}
			/>
		</Field>
		<Field label="Pause on hover">
			<SelectField
				value={view.pauseOnHover ? 'on' : 'off'}
				options={['off', 'on']}
				onChange={(value) => set({ pauseOnHover: value === 'on' ? true : undefined })}
			/>
		</Field>
	{/if}
</div>
