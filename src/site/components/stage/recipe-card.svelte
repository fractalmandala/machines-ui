<script lang="ts">
	import {
		GraphCompare,
		GraphDiff,
		GraphFlow,
		GraphGantt,
		GraphKpi,
		GraphMeter,
		GraphRank,
		GraphSlope,
		GraphStat,
		GraphTimeline,
		GraphUptime
	} from '$lib/components/index.js';
	import { figureLabel, recipeCopy, type Recipe } from '../../../docs/recipes.js';
	import CodeBlock from '../docs/code-block.svelte';

	let { recipe }: { recipe: Recipe } = $props();
</script>

<section class="docs-recipe fs-box fs-gap-bs" id={recipe.slug}>
	<header class="docs-recipe-head fs-box fs-gap-sm">
		<div class="docs-recipe-lede fs-box fs-gap-xs">
			<h2 class="docs-recipe-title">{recipe.title}</h2>
			<p class="docs-note">{recipe.story}</p>
		</div>
		<p class="docs-recipe-tags fs-row fs-gap-sm">
			{#each recipe.tags as tag (tag)}
				<span>[ {tag} ]</span>
			{/each}
		</p>
	</header>

	<div class="docs-recipe-figures fs-grid-2 fs-gap-bs">
		{#each recipe.graphs as figure (figure.slug)}
			<div class="docs-recipe-figure fs-box fs-gap-xs">
				<div class="docs-recipe-plate fs-pad-md">
					{#if figure.component === 'GraphCompare'}
						<GraphCompare {...figure.props} />
					{:else if figure.component === 'GraphDiff'}
						<GraphDiff {...figure.props} />
					{:else if figure.component === 'GraphFlow'}
						<GraphFlow {...figure.props} />
					{:else if figure.component === 'GraphGantt'}
						<GraphGantt {...figure.props} />
					{:else if figure.component === 'GraphKpi'}
						<GraphKpi {...figure.props} />
					{:else if figure.component === 'GraphMeter'}
						<GraphMeter {...figure.props} />
					{:else if figure.component === 'GraphRank'}
						<GraphRank {...figure.props} />
					{:else if figure.component === 'GraphSlope'}
						<GraphSlope {...figure.props} />
					{:else if figure.component === 'GraphStat'}
						<GraphStat {...figure.props} />
					{:else if figure.component === 'GraphTimeline'}
						<GraphTimeline {...figure.props} />
					{:else if figure.component === 'GraphUptime'}
						<GraphUptime {...figure.props} />
					{/if}
				</div>
				<a class="docs-recipe-link" href="/docs/{figure.slug}">[ {figureLabel(figure.slug)} ]</a>
			</div>
		{/each}
	</div>

	<CodeBlock code={recipeCopy(recipe)} />
</section>
