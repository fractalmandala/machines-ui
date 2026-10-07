<script module lang="ts">
	import './settings-section.css';
	import type { Snippet } from 'svelte';
	import Divider from '$lib/components/ui/divider.svelte';
	import IconBadge from '$lib/components/ui/icon-badge.svelte';
	import { cn } from '$lib/utils/utils.js';

	type SettingsSectionProps = {
		id: string;
		title: string;
		description: string;
		icon: Snippet;
		action?: Snippet;
		tone?: 'default' | 'danger';
		children: Snippet;
	};
</script>

<script lang="ts">
	let {
		id,
		title,
		description,
		icon,
		action,
		tone = 'default',
		children
	}: SettingsSectionProps = $props();
</script>

<section
	{id}
	aria-labelledby={`${id}-title`}
	class="fs-relative fs-minw0 fl-settings-section"
>
	<div
		class={cn(
			'fs-row fs-ycenter fs-xbetween fs-gap-bs fl-settings-section-div',
			tone === 'danger' &&
				'fl-settings-section-div-2-2'
		)}
	>
		<div class="fs-row fs-minw0 fs-ycenter fl-settings-section-div-2">
			<IconBadge>{@render icon?.()}</IconBadge>
			<div class="fs-minw0 fs-box">
				<span
					id={`${id}-title`}
					class="fs-text-white fl-settings-section-span"
				>
					{title}
				</span>
				<span class="fs-truncate fs-weight-400 fl-settings-section-span-2">{description}</span>
			</div>
		</div>
		{@render action?.()}
	</div>
	<Divider />
	<div class="fs-box fl-settings-section-div-4">{@render children?.()}</div>
	<div
		class="fs-absolute fl-settings-section-div-5"
	></div>
</section>
