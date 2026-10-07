<script lang="ts">
	import type { PageProps } from './$types.js';

	import CodeBlock from '$site/components/docs/code-block.svelte';
	import TocMenu from '$site/components/docs/toc-menu.svelte';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>machines-ui — components</title></svelte:head>

<section class="fs-content-section fs-narrow-full fs-box fs-gap-xl">
<TocMenu />
<header class="docs-header fs-box fs-gap-sm">
	<span class="docs-kicker">Components</span>
	<h1 class="docs-title">machines-ui</h1>
	<p class="docs-lede">
		Glyph-drawn graphs, animated terminals, diagrams and the frame primitives they share. Every
		page below is generated from the component source: props, defaults and types are read from the
		code, and every example is the live component.
	</p>
</header>

<section class="docs-section fs-box fs-gap-bs">
	<h2 class="docs-h2">Install</h2>
	<CodeBlock code="pnpm add @fractaldesign/machines-ui" lang="shell" />
	<CodeBlock
		code={`import '@fractaldesign/machines-ui/style.css';
import { GraphKpi } from '@fractaldesign/machines-ui';`}
		lang="ts"
	/>
</section>

<section class="docs-section fs-box fs-gap-bs">
	<h2 class="docs-h2">Coverage</h2>
	<div class="fs-row fs-wrap fs-gap-lg">
		<div class="fs-box fs-gap-xs">
			<span class="docs-stat-value">{data.stats.components}</span>
			<span class="docs-muted">components</span>
		</div>
		<div class="fs-box fs-gap-xs">
			<span class="docs-stat-value">{data.stats.previewed}</span>
			<span class="docs-muted">with live preview</span>
		</div>
		<div class="fs-box fs-gap-xs">
			<span class="docs-stat-value">{data.stats.documented} / {data.stats.props}</span>
			<span class="docs-muted">props described</span>
		</div>
	</div>
</section>

{#each data.families as group}
	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2 fs-tt-c">{group.family}</h2>
		<div class="fs-card-grid">
			{#each group.items as item}
				<a class="fs-card fs-box fs-gap-xs" href="/docs/{item.slug}">
					<span class="docs-mono">{item.name}</span>
					{#if item.description}<span class="docs-note">{item.description}</span>{/if}
				</a>
			{/each}
		</div>
	</section>
{/each}

</section>
