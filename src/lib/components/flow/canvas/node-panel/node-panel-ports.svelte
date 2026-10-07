<script module lang="ts">
	import './node-panel-look.css';
	import { Field } from '$lib/components/ui/field.js';
	import Button from '$lib/components/ui/button.svelte';
	import SelectField from '$lib/components/ui/select-field.svelte';
	import { PORT_IDS, PORT_SIDES, type NodePort, type PortId, type PortSide } from '$lib/core/values.js';
	import type { FlowNodeData } from '$lib/stores/flow-store.svelte';
	import { inputSide, outputsOf } from '../flow-geometry.js';

	type NodePanelPortsProps = {
		node: FlowNodeData;
	};

	const NONE = 'none';
</script>

<script lang="ts">
	import { checkpoint, updateNode } from '$lib/stores/flow-store.svelte';

	let { node }: NodePanelPortsProps = $props();

	const input = $derived(inputSide(node));
	const outputs = $derived(outputsOf(node));

	// every change is one undo step
	function setOutputs(next: NodePort[]) {
		checkpoint();
		updateNode(node.id, { outputs: next });
	}

	function setPort(index: number, patch: Partial<NodePort>) {
		setOutputs(outputs.map((port, at) => (at === index ? { ...port, ...patch } : port)));
	}
</script>

<div class="fs-box fs-gap-bs">
	<Field label="Input side">
		<SelectField
			value={input || NONE}
			options={[NONE, ...PORT_SIDES]}
			onChange={(value) => {
				checkpoint();
				updateNode(node.id, { input: value === NONE ? false : (value as PortSide) });
			}}
		/>
	</Field>
	<Field label="Outputs" hint="Ports sharing a side spread evenly along it.">
		<div class="fs-box fs-gap-xs">
			{#each outputs as port, index (index)}
				<div class="fl-node-panel-look-row">
					<SelectField
						value={port.id}
						options={PORT_IDS}
						onChange={(value) => setPort(index, { id: value as PortId })}
					/>
					<SelectField
						value={port.side}
						options={PORT_SIDES}
						onChange={(value) => setPort(index, { side: value as PortSide })}
					/>
					<Button variant="field" size="xs" onClick={() => setOutputs(outputs.filter((_, at) => at !== index))}>
						remove
					</Button>
				</div>
			{/each}
			<Button
				variant="field"
				size="xs"
				onClick={() =>
					setOutputs([
						...outputs,
						{ id: PORT_IDS.find((id) => !outputs.some((port) => port.id === id)) ?? 'out', side: 'bottom' }
					])}
			>
				add output
			</Button>
		</div>
	</Field>
</div>
