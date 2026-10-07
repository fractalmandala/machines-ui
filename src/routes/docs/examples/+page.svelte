<script lang="ts">
	import { recipes } from '../../../docs/recipes.js';
	import TocMenu from '$site/components/docs/toc-menu.svelte';
	import RecipeCard from '$site/components/stage/recipe-card.svelte';
</script>

<svelte:head><title>Examples — machines-ui</title></svelte:head>

<section class="fs-content-section fs-narrow-full">
	<TocMenu />
	<header class="docs-header">
		<span class="docs-kicker">Examples</span>
		<h1 class="docs-title">Recipes</h1>
		<p class="docs-lede">
			Two graphs per write-up is enough, with prose between them. Each recipe is live and copies as
			one Svelte snippet.
		</p>
	</header>

	<div class="fs-box fs-gap-xl">
		{#each recipes as recipe (recipe.slug)}
			<RecipeCard {recipe} />
		{/each}
	</div>
</section>
