<script module lang="ts">
	import './overview-top-posts.css';
	import Button from '$lib/components/ui/button.svelte';
	import Divider from '$lib/components/ui/divider.svelte';
	import IconBadge from '$lib/components/ui/icon-badge.svelte';
	import Tag from '$lib/components/ui/tag.svelte';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte';
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte';
	import DropdownMenuRadioGroup from '$lib/components/ui/shadcn/DropdownMenuRadioGroup.svelte';
	import DropdownMenuRadioItem from '$lib/components/ui/shadcn/DropdownMenuRadioItem.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte';
	import PostsIcon from '$lib/icons/overview/posts.svelte';
	import MailLineIcon from '$lib/icons/overview/mail-line.svelte';
	import MailOpenedIcon from '$lib/icons/overview/mail-opened.svelte';
	import ClickLineIcon from '$lib/icons/overview/click-line.svelte';
	import ChevronIcon from '$lib/icons/flow/chevron-right.svelte';
	import { POST_SORTS, topPosts, type PostSort } from './overview-data.js';

	type OverviewTopPostsProps = {
		seed: string;
	};
</script>

<script lang="ts">
	let { seed }: OverviewTopPostsProps = $props();

	let sort = $state<PostSort>('Open Rate');

	let posts = $derived(topPosts(seed, sort));
</script>

<section
	aria-label="Top posts"
	class="fs-relative fs-box fl-overview-top-posts"
>
	<div class="fs-row fs-shrink-0 fs-ycenter fs-xbetween fs-gap-md fl-overview-top-posts-div">
		<div class="fs-row fs-minw0 fs-ycenter fl-overview-top-posts-div-2">
			<IconBadge><PostsIcon class="fs-text-white fl-overview-top-posts-posts-icon" /></IconBadge>
			<span
				class="fs-text-white fl-overview-top-posts-span"
			>
				Top Posts
			</span>
		</div>
		<DropdownMenu>
			<DropdownMenuTrigger>
				{#snippet child({ props })}
					<Button {...props} variant="field" size="field" className="fl-overview-top-posts-button">
						<span class="fs-pr-xs fs-pl-sm">{sort}</span>
						<ChevronIcon
							aria-hidden="true"
							class="fl-overview-top-posts-chevron-icon"
						/>
					</Button>
				{/snippet}
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="fl-overview-top-posts-dropdown-menu-conten">
				<DropdownMenuRadioGroup value={sort} onValueChange={(value) => (sort = value as PostSort)}>
					{#each POST_SORTS as option (option)}
						<DropdownMenuRadioItem value={option}>{option}</DropdownMenuRadioItem>
					{/each}
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
	<Divider />
	<div class="fs-minh0 fs-grow fs-box fl-overview-top-posts-div-3">
		<ol
			class="fs-grow fs-box fl-overview-top-posts-ol"
		>
			{#each posts as post, index (post.title)}
				<li class="fs-grow fs-box">
					{#if index > 0}
						<Divider />
					{/if}
					<div class="fs-grow fs-box fs-px-md fs-py-sm fl-overview-top-posts-div-4">
						<span class="fs-px-sm fs-py-xs fs-text-white fl-overview-top-posts-span-3">{post.title}</span>
						<div class="fs-row fs-ycenter fs-xbetween fs-gap-md fs-px-sm fl-overview-top-posts-div-5">
							<div
								class="fs-row fs-ycenter fs-gap-md fs-weight-500 fl-overview-top-posts-div-6"
							>
								<span class="fs-row fs-ycenter" title="Sent">
									<MailLineIcon aria-label="Sent" class="fl-overview-top-posts-sent" />
									<span class="fs-pr-xs fs-pl-xs">{post.sent}</span>
								</span>
								<span aria-hidden="true" class="fl-overview-top-posts-span-6"></span>
								<span class="fs-row fs-ycenter" title="Opened">
									<MailOpenedIcon aria-label="Opened" class="fl-overview-top-posts-opened" />
									<span class="fs-pr-xs fs-pl-xs">{post.opened}</span>
								</span>
								<span aria-hidden="true" class="fl-overview-top-posts-span-9"></span>
								<span class="fs-row fs-ycenter" title="Clicked">
									<ClickLineIcon aria-label="Clicked" class="fl-overview-top-posts-clicked" />
									<span class="fs-pr-xs fs-pl-xs">{post.clicked}</span>
								</span>
							</div>
							<div class="fs-row fs-ycenter fs-gap-md">
								<span class="fs-weight-400 fl-overview-top-posts-span-12"
									>{post.date}</span
								>
								<Tag tone="cyan">Published</Tag>
							</div>
						</div>
					</div>
				</li>
			{/each}
		</ol>
	</div>
	<div
		class="fs-absolute fl-overview-top-posts-div-8"
	></div>
</section>
