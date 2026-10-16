<script lang="ts">
	import '$site/styles/index.sass';
	import '$lib/styles/fs.css';
	import '$lib/styles/palette.css';
	import ModeToggle from '$site/mode/ModeToggle.svelte';
	import { modeScript, toggleMode, mode } from '$site/mode/mode.svelte'
	import { page } from '$app/state';
	import ColorPicker from '$site/components/accent/AccentDropdown.svelte'
	import { accentScript, restoreAccent } from '$lib/utils/accents.js';
	import { onMount } from 'svelte';
	import Sitelogo from '$site/components/logo-svg.svelte'

	let { children } = $props();
	const m = mode();
	const dark = $derived(m.resolved === 'dark');
	// below 1025px the docs sidebar is a drawer: fractalstyler shows it when the shell has `fs-open`
	let open = $state(false);
	const inDocs = $derived(page.url.pathname.startsWith('/docs'));

	// the saved accent (or the default) sets --theme-color and the graph accents together
	onMount(restoreAccent);

	$effect(() => {
		page.url.pathname;
		open = false;
	});
</script>

<svelte:window onkeydown={(event) => event.key === 'Escape' && (open = false)} />
<svelte:head>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script>${modeScript()}<\x2fscript>`}
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html `<script>${accentScript()}<\x2fscript>`}
</svelte:head>

<div class="fs-app-shell" class:fs-open={open}>
	<header class="fs-app-header fs-row fs-xbetween fs-wfull">
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
			<a class="fs-text-primary" href="/">
				<Sitelogo height={18}/>
			</a>
		</div>
		<nav class="fs-row fs-ycenter fs-gap-xl">
			<a class="heading-link" href="/docs">Docs</a>
			<a class="heading-link" href="/creator">Creator</a>
			<ColorPicker/>
			<ModeToggle />
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
