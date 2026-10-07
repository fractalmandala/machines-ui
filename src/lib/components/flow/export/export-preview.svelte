<script lang="ts">
	import './export-preview.css';
	import '$lib/styles/palette.css';
	interface ExportPreviewProps {
		content: string;
		format: 'json' | 'markdown' | string;
	}

	let { content, format }: ExportPreviewProps = $props();
	let lines = $derived(content.split('\n'));
	const jsonPattern = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;
</script>

{#snippet jsonLine(line: string)}
	{@const parts = line.split(jsonPattern)}
	{#each parts as part, index (index)}
		{#if part}
			{#if index % 5 === 1 && parts[index + 1]}
				<span class="fl-export-preview">{part}</span><span>{parts[index + 1]}</span>
			{:else if index % 5 === 1}
				<span class="fl-export-preview-span">{part}</span>
			{:else if index % 5 === 3 || index % 5 === 4}
				<span class="fl-export-preview-span-2">{part}</span>
			{:else if index % 5 !== 2}
				{part}
			{/if}
		{/if}
	{/each}
{/snippet}

{#snippet markdownLine(line: string)}
	{#if line.startsWith('#')}
		<span class="fs-weight-600 fs-text-white">{line}</span>
	{:else if line.startsWith('>')}
		<span class="fl-export-preview-span-4">{line}</span>
	{:else}
		{#each line.split(/(\*\*[^*]+\*\*)/g) as part, index (index)}
			{#if part.startsWith('**')}
				<span class="fl-export-preview-span-5">{part}</span>
			{:else}
				{part}
			{/if}
		{/each}
	{/if}
{/snippet}

{#snippet csvLine(line: string)}
	{#each line.split(',') as cell, index (index)}
		<span>
			<span class={index === 0 ? 'fl-export-preview-span-6' : index === 1 ? 'fl-export-preview-span-6-1' : undefined}
				>{cell}</span
			>{#if index < line.split(',').length - 1}<span class="fl-export-preview-span-7">,</span>{/if}
		</span>
	{/each}
{/snippet}

<pre
	class="fs-minh0 fs-grow fs-py-md fl-export-preview-pre">
	<code class="fs-grid fl-export-preview-code">
		{#each lines as line, index (index)}
			<span class="fl-export-preview-span-8">
				<span class="fs-px-md fs-ta-r fl-export-preview-span-9">{index + 1}</span>
				<span class="fs-pr-bs fl-export-preview-span-10">
					{#if format === 'json'}
						{@render jsonLine(line)}
					{:else if format === 'markdown'}
						{@render markdownLine(line)}
					{:else}
						{@render csvLine(line)}
					{/if}
				</span>
			</span>
		{/each}
	</code>
</pre>
