<script module lang="ts">
	import './overview-stat-card.css';
	import IconBadge from '$lib/components/ui/icon-badge.svelte';
	import { cn } from '$lib/utils/utils.js';
	import UserIcon from '$lib/icons/overview/user.svelte';
	import MailIcon from '$lib/icons/overview/mail.svelte';
	import ClickIcon from '$lib/icons/overview/click.svelte';
	import CardGlow from '$lib/icons/overview/card-glow.svelte';
	import type { Stat } from './overview-data.js';

	const ICONS = {
		user: UserIcon,
		mail: MailIcon,
		click: ClickIcon
	};

	type OverviewStatCardProps = {
		stat: Stat;
		textureSrc: string;
	};
</script>

<script lang="ts">
	let { stat, textureSrc }: OverviewStatCardProps = $props();

	let Icon = $derived(ICONS[stat.icon]);
</script>

<div
	class="fs-relative fs-minw0 fs-box fl-overview-stat-card-group-stat fl-overview-stat-card"
>
	<img
		src={textureSrc}
		alt=""
		width="450"
		height="140"
		class="fs-absolute fl-overview-stat-card-img"
	/>
	<CardGlow
		aria-hidden
		class="fs-absolute fl-overview-stat-card-card-glow"
	/>
	<div class="fs-relative fs-box fl-overview-stat-card-div">
		<div class="fs-row fs-ycenter fl-overview-stat-card-div-2">
			<IconBadge><Icon class="fs-text-white fl-overview-stat-card-icon" /></IconBadge>
			<span
				class="fl-overview-stat-card-span"
			>
				{stat.label}
			</span>
		</div>
		<div class="fs-row fs-ybot fs-xbetween fs-gap-md">
			<div class="fs-row fs-minw0 fs-ybot fl-overview-stat-card-div-4">
				<span
					class="fs-weight-500 fs-text-white fl-overview-stat-card-span-2"
				>
					{stat.value}
					{#if stat.unit}
						<span class="fl-overview-stat-card-span-3">{stat.unit}</span>
					{/if}
				</span>
				<span
					class="fs-truncate fs-py-xs fs-weight-500 fl-overview-stat-card-span-4"
				>
					{stat.from}
				</span>
			</div>
			<span class="fs-shrink-0 fl-overview-stat-card-span-5">
				<span
					class={cn(
						'fs-row fs-h-md fs-ycenter fs-xcenter fs-radius-full fs-px-sm fs-weight-600 fl-overview-stat-card-span-6',
						stat.negative ? 'fl-overview-stat-card-span-6-1' : 'fl-overview-stat-card-span-6-2'
					)}
				>
					{stat.change}
				</span>
			</span>
		</div>
	</div>
	<div
		class="fs-absolute fl-overview-stat-card-div-5"
	></div>
</div>
