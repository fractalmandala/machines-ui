<script module lang="ts">
	import './SettingsRow.css';
	import type { Snippet } from 'svelte';

	type SettingsRowProps = {
		title: string;
		description: string;
		children: Snippet;
		htmlFor?: string;
	};
</script>

<script lang="ts">
	let { title, description, children, htmlFor }: SettingsRowProps = $props();
</script>

<div
	class="fs-row fs-ycenter fs-xbetween fs-gap-lg fs-px-bs fs-py-md fl-settings-row"
>
	<label for={htmlFor} class="fs-minw0 fs-box fl-settings-row-label">
		<span class="fs-text-white fl-settings-row-span">{title}</span>
		<span class="fs-weight-400 fl-settings-row-span-2">{description}</span>
	</label>
	<div class="fs-row fs-shrink-0 fs-ycenter fs-gap-sm">{@render children?.()}</div>
</div>
