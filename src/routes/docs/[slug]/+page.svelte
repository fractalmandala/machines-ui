<script lang="ts">
	import CodeBlock from '$site/components/docs/code-block.svelte';
	import TocMenu from '$site/components/docs/toc-menu.svelte';
	import { previews } from '../../../docs/previews.js';

	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	const c = $derived(data.component);
	const examples = $derived(previews[c.slug] ?? []);
	const propRows = $derived(c.props.filter((p) => !p.snippet && !p.callback));
	const snippets = $derived(c.props.filter((p) => p.snippet));
	const callbacks = $derived(c.props.filter((p) => p.callback));
	const hasClass = $derived(c.props.some((p) => p.name === 'class'));
</script>

<svelte:head><title>{c.displayName} — machines-ui</title></svelte:head>

<section class="fs-content-section fs-narrow-full fs-box fs-gap-xl">

<TocMenu />
<header class="docs-header fs-box fs-gap-sm">
	<span class="docs-kicker">{c.family}</span>
	<h1 class="docs-title">{c.displayName}</h1>
	{#if c.description}<p class="docs-lede">{c.description}</p>{/if}
</header>

<section class="docs-section fs-box fs-gap-bs">
	<h2 class="docs-h2">Install</h2>
	<CodeBlock code="pnpm add @fractaldesign/machines-ui" lang="shell" />
	<CodeBlock
		code={`import '@fractaldesign/machines-ui/style.css';
import { ${c.name} } from '@fractaldesign/machines-ui';`}
		lang="ts"
	/>
</section>

<section class="docs-section fs-box fs-gap-bs" class:wide={examples.some((e) => e.frame)}>
	<h2 class="docs-h2">Preview</h2>
	{#each examples as ex, i}
		{@const Comp = ex.Comp}
		{@const code = c.examples[i] ?? ex.code ?? ''}
		<div class="docs-example fs-box">
			{#if ex.frame}
				<iframe class="docs-frame" src={ex.frame} title="{c.displayName} live demo" loading="lazy"></iframe>
			{:else if Comp}
				<div class="docs-stage fs-box fs-gap-md fs-pad-xl"><Comp {...ex.props} /></div>
			{/if}
			<CodeBlock {code} />
		</div>
	{:else}
		<p class="docs-note">No live example yet.</p>
	{/each}
</section>

{#if c.examples.length > examples.length}
	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Usage</h2>
		{#each c.examples.slice(examples.length) as code, i}
			<CodeBlock {code} />
		{/each}
	</section>
{/if}

{#if propRows.length}
	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Props</h2>
		<div class="docs-table-wrap">
			<table class="docs-table">
				<thead>
					<tr><th>Prop</th><th>Type</th><th>Default</th><th>Description</th></tr>
				</thead>
				<tbody>
					{#each propRows as p}
						<tr>
							<td class="docs-mono">
								{p.name}{#if !p.optional}<span class="docs-req" title="required">*</span>{/if}
								{#if p.only}<div><span class="docs-pill" title="Only the {p.only.join(' and ')} look takes this prop">{p.only.join(', ')} only</span></div>{/if}
							</td>
							<td class="docs-mono">
								{p.type}
								{#if p.values}
									<div>
										{#each p.values as v}<span class="docs-pill">{v}</span>{/each}
									</div>
								{/if}
							</td>
							<td class="docs-mono">{p.default ?? '—'}</td>
							<td>{p.description ?? p.alias ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

{#if c.deprecated}
	<p class="docs-note"><span class="docs-pill">deprecated</span> {c.deprecated}</p>
{/if}

{#if snippets.length || callbacks.length || hasClass || c.motion.animatedProp || c.motion.reveal || c.motion.reducedMotion}
	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">API</h2>
		<ul class="fs-row fs-wrap fs-gap-sm">
			{#each snippets as p}
				<li><span class="docs-pill">snippet</span> <span class="docs-mono">{p.name}</span> {p.description ?? ''}</li>
			{/each}
			{#each callbacks as p}
				<li><span class="docs-pill">callback</span> <span class="docs-mono">{p.name}</span> <span class="docs-muted docs-mono">{p.type}</span> {p.description ?? ''}</li>
			{/each}
			{#if hasClass}
				<li><span class="docs-pill">class</span> forwarded to the outer element</li>
			{/if}
			{#if c.motion.animatedProp}
				<li><span class="docs-pill">motion</span> runs live; set <span class="docs-mono">animated={'{false}'}</span> to freeze</li>
			{/if}
			{#if c.motion.reveal}
				<li><span class="docs-pill">motion</span> reveals on scroll into view</li>
			{/if}
			{#if c.motion.reducedMotion}
				<li><span class="docs-pill">a11y</span> honours <span class="docs-mono">prefers-reduced-motion</span></li>
			{/if}
		</ul>
	</section>
{/if}

{#if c.moduleTypes.length}
	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Types</h2>
		<div class="docs-table-wrap">
			<table class="docs-table">
				<thead><tr><th>Name</th><th>Kind</th><th>Description</th></tr></thead>
				<tbody>
					{#each c.moduleTypes as t}
						<tr>
							<td class="docs-mono">{t.name}</td>
							<td class="docs-mono">{t.kind}</td>
							<td>
								{#if t.doc}{t.doc}{/if}
								{#if t.definition}<div class="docs-mono docs-muted">{t.definition}</div>{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

{#if c.tokens.length}
	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Theming</h2>
		<p class="docs-note">CSS custom properties this component reads.</p>
		<ul class="fs-row fs-wrap fs-gap-sm">
			{#each c.tokens as t}<li class="docs-pill">{t}</li>{/each}
		</ul>
	</section>
{/if}

{#if data.used.length || data.usedBy.length}
	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Related</h2>
		{#if data.used.length}
			<p class="docs-note">Built from</p>
			<ul class="fs-row fs-wrap fs-gap-sm">
				{#each data.used as r}<li><a class="docs-pill" href="/docs/{r.slug}">{r.name}</a></li>{/each}
			</ul>
		{/if}
		{#if data.usedBy.length}
			<p class="docs-note">Used by</p>
			<ul class="fs-row fs-wrap fs-gap-sm">
				{#each data.usedBy as r}<li><a class="docs-pill" href="/docs/{r.slug}">{r.name}</a></li>{/each}
			</ul>
		{/if}
	</section>
{/if}

<p class="docs-note docs-mono">{c.file}</p>

</section>