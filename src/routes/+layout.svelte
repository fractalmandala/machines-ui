<script lang="ts">
	import '../app.css';
	import '$site/styles/index.sass';
	import '$lib/styles/fs.css';
	import '$lib/styles/palette.css';
	import { page } from '$app/state';
	import ColorPicker from '$site/components/accent/AccentDropdown.svelte'

	let { children } = $props();

	// below 1025px the docs sidebar is a drawer: fractalstyler shows it when the shell has `fs-open`
	let open = $state(false);
	const inDocs = $derived(page.url.pathname.startsWith('/docs'));

	$effect(() => {
		page.url.pathname;
		open = false;
	});
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (open = false)} />

<div class="fs-app-shell" class:fs-open={open}>
	<header class="fs-app-header fs-row fs-xbetween fs-bb fs-wfull">
		<div class="fs-row fs-ycenter fs-gap-sm">
			{#if inDocs}
				<button
					type="button"
					class="docs-menu-toggle"
					aria-label={open ? 'Close menu' : 'Open menu'}
					aria-expanded={open}
					onclick={() => (open = !open)}>{open ? '✕' : '☰'}</button
				>
			{/if}
			<a class="fs-logo-link" href="/">machines-ui</a>
		</div>
		<nav class="fs-nav-header fs-row fs-ycenter fs-gap-bs">
			<a href="/docs">Docs</a>
			<a href="/creator">Creator</a>
			<ColorPicker/>
		</nav>
	</header>
	{#if open}
		<button type="button" class="docs-backdrop" aria-label="Close menu" onclick={() => (open = false)}></button>
	{/if}
	<main class="fs-app-main">
		{@render children()}
	</main>
	<footer class="fs-app-footer">
		<span>machines-ui</span>
	</footer>
</div>
