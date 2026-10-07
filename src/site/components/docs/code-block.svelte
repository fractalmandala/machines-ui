<script lang="ts">
	// Highlighted code with a copy button. @fractaldesign/pop turns the string into HTML spans;
	// the colours come from --fp-* tokens set in docs.sass, so the block follows the accent.
	import { highlight } from '@fractaldesign/pop/full';

	let { code, lang = 'svelte', copy = true }: { code: string; lang?: string; copy?: boolean } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const html = $derived(highlight(code, { lang }));

	$effect(() => () => clearTimeout(timer));

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(code);
		} catch {
			return;
		}

		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1200);
	}
</script>

<pre class="docs-code">{#if copy}<button class="docs-copy" type="button" onclick={copyCode}>{copied ? 'copied' : 'copy'}</button>{/if}<code>{@html html}</code></pre>
