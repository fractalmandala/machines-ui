<script lang="ts">
	import { toc } from '$site/stores/toc.svelte.js';

	let details = $state<HTMLDetailsElement>();
</script>

<!-- Shown only where the right sidebar is hidden (1280px and below) -->
{#if toc.items.length}
	<details class="docs-toc-menu" bind:this={details}>
		<summary class="fs-mono fs-text-sm">On this page</summary>
		<nav class="fs-box fs-gap-xs fs-pad-sm" aria-label="On this page">
			{#each toc.items as item (item.id)}
				<a class="fs-nav-link-sm" href="#{item.id}" onclick={() => details && (details.open = false)}>
					{item.text}
				</a>
			{/each}
		</nav>
	</details>
{/if}
