<script lang="ts">
	import {
		FlowNode,
		Frame,
		GraphActivity,
		GraphBoot,
		GraphFire,
		GraphLatency,
		GraphLife,
		GraphPulse,
		GraphRain,
		GraphScope,
		GraphTicker
	} from '$lib/components/index.js';
	import CodeBlock from '$site/components/docs/code-block.svelte';

	let { data } = $props();

	// a year of commits, the same every load
	const days = Array.from({ length: 371 }, (_, i) => {
		const date = new Date(Date.UTC(2025, 9, 7) + i * 86_400_000).toISOString().slice(0, 10);
		const noise = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;

		return { date, count: noise > 0.92 ? 14 : noise > 0.8 ? 8 : noise > 0.6 ? 4 : noise > 0.4 ? 1 : 0 };
	});

	const latency = Array.from({ length: 30 }, (_, i) => ({
		p50: 100 + Math.round(Math.sin(i / 3) * 20),
		p95: 280 + Math.round(Math.cos(i / 4) * 50) + i * 4,
		p99: 480 + Math.round(Math.sin(i / 2) * 100) + i * 6,
		spike: i === 12 || i === 22
	}));
</script>

<svelte:head>
	<title>machines-ui — graphs, animations, diagrams and a workflow builder</title>
	<meta
		name="description"
		content="Svelte 5 components drawn with characters: graphs, animated terminals, diagrams, and a node-and-edge workflow builder."
	/>
</svelte:head>

<section class="fs-content-section fs-box fs-gap-2xl home">
	<div class="fs-grid-6 fs-gap-xl">
		<div class="fs-cspan-3 fs-box fs-gap-bs fs-ycenter">
			<span class="docs-kicker">machines-ui · {data.total} components</span>
			<h1 class="fs-page-title fs-text-4xl">Graphs, animation, diagrams — and the machine that runs them.</h1>
			<p class="fs-page-desc fs-text-secondary">
				Svelte components drawn with characters, not pixels: dashed frames, block glyphs, monospace
				sugar. From a KPI in a paragraph to a full workflow builder, one library.
			</p>
			<CodeBlock code="pnpm add @fractaldesign/machines-ui" lang="shell" />
			<div class="fs-row fs-gap-sm fs-wrap">
				<a class="fs-primary fs-modern fs-px-bs" href="/docs">Docs</a>
				<a class="fs-outline fs-modern fs-px-bs" href="/creator">Open the builder</a>
				<a class="fs-outline fs-modern fs-px-bs" href="/docs/examples">Examples</a>
			</div>
		</div>
		<div class="fs-cspan-3 fs-box fs-ycenter">
			<GraphBoot
				title="BOOT"
				steps={[
					{ label: 'load glyphs', eta: '~0.2s' },
					{ label: `mount ${data.total} components`, eta: '~0.4s' },
					{ label: 'wire the flow' },
					{ label: 'ready' }
				]}
			/>
		</div>
	</div>

	<div class="fs-box fs-gap-bs">
		<h2 class="fs-page-heading-lg">What’s in the box</h2>
		<div class="fs-card-grid">
			{#each data.families as family (family.family)}
				<a class="fs-card fs-box fs-gap-xs fs-link-plain" href="/docs/{family.first}">
					<span class="docs-stat-value">{family.count}</span>
					<span class="fs-card-title">{family.label}</span>
					<span class="fs-card-desc fs-text-muted">{family.blurb}</span>
				</a>
			{/each}
		</div>
	</div>

	<div class="fs-box fs-gap-xl">
		<h2 class="fs-page-heading-lg">Live, not screenshots</h2>
		<div class="fs-grid-3 fs-gap-xl fs-ytop">
			<GraphLatency title="CHECKOUT" unit="ms" labels={['09:00', '09:30']} data={latency} />
			<GraphPulse title="API" length={48} intervalMs={900} />
			<GraphScope
				title="RPM"
				mode="area"
				data={[12, 18, 31, 27, 44, 39, 52, 48, 61, 55, 40, 33, 25, 29, 37]}
			/>
		</div>
		<div class="fs-grid-3 fs-gap-xl fs-ytop">
			<GraphFire title="FURNACE" cols={36} rows={10} />
			<GraphRain title="RAIN" cols={36} rows={10} />
			<GraphLife title="LIFE" />
		</div>
		<GraphActivity title="COMMITS" palette="multi" {days} />
		<GraphTicker
			title="FLEET"
			items={[
				{ label: 'api', status: 'ok' },
				{ label: 'db-lag 2.1s', status: 'warn' },
				{ label: 'edge-eu', status: 'down' },
				{ label: 'cdn', status: 'ok' },
				{ label: 'docs', status: 'ok' },
				{ label: 'build #412', status: 'ok' }
			]}
		/>
	</div>

	<div class="fs-grid-2 fs-gap-xl fs-ycenter">
		<div class="fs-box fs-gap-bs">
			<span class="docs-kicker">the builder</span>
			<h2 class="fs-page-heading-xl">Workflows on a canvas</h2>
			<p class="fs-page-desc fs-text-secondary">
				Nodes, ports and routed edges, with a run log, an inspector and ten ready-made flows: an
				agent router, JSON to Markdown, an LLM wiki and more. Every node is a component you can also
				use on its own.
			</p>
			<div class="fs-row fs-gap-sm"><a class="fs-primary fs-modern fs-px-bs" href="/creator">Open /creator</a></div>
		</div>
		<Frame title="FLOW" pad="lg">
			<div class="fs-box fs-gap-bs">
				<FlowNode title="Trigger" status="done" outputs={[{ id: 'out', side: 'bottom' }]} input={false}>
					<strong>Prompt submitted</strong>
					<p>A prompt reaches the router.</p>
				</FlowNode>
				<FlowNode look="card" title="Run Agent" status="running">
					<strong>Jev classifies the prompt</strong>
					<p>How complex is this request?</p>
				</FlowNode>
			</div>
		</Frame>
	</div>
</section>
