<script lang="ts">
	import Example from './example.svx';
</script>

<svelte:head>
	<title>Markdown graphs — machines-ui</title>
	<meta
		name="description"
		content="Write machines-ui components inline in .svx markdown files — one tag between paragraphs, rendered server-side."
	/>
</svelte:head>

<section class="fs-content-section fs-narrow-half fs-gap-xl">
	<header class="docs-header">
		<span class="docs-kicker">mdsvex</span>
		<h1 class="docs-title">Markdown graphs.</h1>
		<p class="docs-lede">
			This page is written in markdown. Everything under the rule is <code>example.svx</code> — a
			real .svx file imported like a component and rendered inside this one. Prose styling comes
			from one global <code>.fg-prose</code> class; the graphs style themselves.
		</p>
	</header>

	<div class="fg-prose">
		<Example />
	</div>
</section>
