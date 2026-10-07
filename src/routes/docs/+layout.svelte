<script lang="ts">
	import '$lib/styles/library.sass';
	import './docs.sass';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { toc } from '$site/stores/toc.svelte.js';

	let { data, children } = $props();

	// Search matches the names the sidebar shows (Kpi, not GraphKpi), so "graph" doesn't match fifty rows.
	let query = $state('');

	const GUIDES = [
		{ name: 'Examples', slug: 'examples', href: '/docs/examples' },
		{ name: 'Markdown (mdsvex)', slug: 'mdsvex', href: '/mdsvex' }
	];

	const needle = $derived(query.trim().toLowerCase());
	const match = (name: string) => !needle || name.toLowerCase().includes(needle);
	const guides = $derived(GUIDES.filter((item) => match(item.name)));
	const groups = $derived(
		data.groups
			.map((group) => ({ ...group, items: group.items.filter((item) => match(item.name)) }))
			.filter((group) => group.items.length)
	);
	const empty = $derived(!guides.length && !groups.length);
	const here = (href: string) => (page.url.pathname === href ? 'page' : undefined);

	// "On this page": the h2s of the current page, given ids so they can be linked.
	$effect(() => {
		page.url.pathname;
		tick().then(() => {
			toc.items = [...document.querySelectorAll('.docs-main h2')].map((h) => {
				const text = h.textContent?.trim() ?? '';

				h.id ||= text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

				return { id: h.id, text };
			});
		});
	});
</script>

<aside class="fs-sidebar-left">
	<nav class="fs-box fs-gap-bs fs-pad-bs" aria-label="Components">
		<input
			class="fs-input fs-small"
			type="search"
			placeholder="Search components"
			aria-label="Search components"
			bind:value={query}
		/>

		{#if guides.length}
			<div class="fs-nav-section">
				<span class="fs-nav-header">Guides</span>
				{#each guides as item (item.slug)}
					<a class="fs-nav-link-sm" href={item.href} aria-current={here(item.href)}>{item.name}</a>
				{/each}
			</div>
		{/if}

		{#each groups as group (group.family)}
			<div class="fs-nav-section">
				<span class="fs-nav-header">{group.label}</span>
				{#each group.items as item (item.slug)}
					<a class="fs-nav-link-sm" href="/docs/{item.slug}" aria-current={here(`/docs/${item.slug}`)}>
						{item.name}
					</a>
				{/each}
			</div>
		{/each}

		{#if empty}
			<p class="docs-note">No component named “{query}”.</p>
		{/if}
	</nav>
</aside>

<section class="fs-main-section docs-main">
	{@render children()}
</section>

<aside class="fs-sidebar-right">
	{#if toc.items.length}
		<nav class="fs-box fs-gap-xs fs-pad-bs" aria-label="On this page">
			<span class="fs-nav-header">On this page</span>
			{#each toc.items as item (item.id)}
				<a class="fs-nav-link-sm" href="#{item.id}">{item.text}</a>
			{/each}
		</nav>
	{/if}
</aside>
