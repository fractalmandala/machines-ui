<script module lang="ts">
	import './profile-menu.css';
	import type { Component } from 'svelte';
	import { toast } from 'svelte-sonner';
	import Asset from '$lib/components/ui/asset/index.js';
	import DropdownMenu from '$lib/components/ui/shadcn/dropdown-menu.svelte';
	import DropdownMenuContent from '$lib/components/ui/shadcn/DropdownMenuContent.svelte';
	import DropdownMenuGroup from '$lib/components/ui/shadcn/DropdownMenuGroup.svelte';
	import DropdownMenuItem from '$lib/components/ui/shadcn/DropdownMenuItem.svelte';
	import DropdownMenuTrigger from '$lib/components/ui/shadcn/DropdownMenuTrigger.svelte';
	import { cn , resolveState, type StateInput } from '$lib/utils/utils.js';
	import PersonalInfoIcon from '$lib/icons/profile/personal-info.svelte';
	import AccountSecurityIcon from '$lib/icons/profile/account-security.svelte';
	import TemplatesIcon from '$lib/icons/profile/templates.svelte';
	import UsersIcon from '$lib/icons/profile/users.svelte';
	import SettingsIcon from '$lib/icons/profile/settings.svelte';
	import LogoutIcon from '$lib/icons/profile/logout.svelte';
	import SparklesIcon from '$lib/icons/profile/sparkles.svelte';
	import PlusIcon from '$lib/icons/profile/plus.svelte';

	type ProfileMenuProps = {
		avatarSrc: string;
	};

	type MenuEntry = {
		label: string;
		// $lib/svg/* icon stubs are typed Component<Record<string, unknown>>
		Icon: Component<Record<string, unknown>>;
		onSelect: () => void;
	};

	const divider =
		'fs-shrink-0 fl-profile-menu-divider';

	const menuItem =
		'fs-px-xs fs-weight-500 fs-text-white fl-profile-menu-menu-item';
</script>

<script lang="ts">
	import { app, openAutomation } from '$lib/stores/app-store.svelte';

	let { avatarSrc }: ProfileMenuProps = $props();

	let open = $state(false);
	function setOpen(value: StateInput<boolean>) {
		open = resolveState(open, value);
	}

	const automationId = $derived(app.automationId);

	let entries: MenuEntry[] = $derived([
		{
			label: 'Personal info',
			Icon: PersonalInfoIcon,
			onSelect: () =>
				toast('Personal info', { description: 'Marcel Kargul · marcel@example.com' })
		},
		{
			label: 'Account Security',
			Icon: AccountSecurityIcon,
			onSelect: () =>
				toast.success('Two-factor authentication is on', {
					description: 'Last sign-in from Lisbon, 2 minutes ago.'
				})
		},
		{
			label: 'Templates',
			Icon: TemplatesIcon,
			onSelect: () =>
				toast('8 templates in your library', {
					description: 'Open the Actions panel and pick Template to use one.'
				})
		},
		{
			label: 'Manage users',
			Icon: UsersIcon,
			onSelect: () =>
				toast('3 people have access', {
					description: 'Marcel (owner), Leo (editor), Priya (viewer).'
				})
		},
		{
			label: 'Settings',
			Icon: SettingsIcon,
			onSelect: () => openAutomation(automationId, 'settings')
		}
	]);
</script>

<div
	aria-hidden="true"
	data-open={open || undefined}
	class="fs-fixed fl-profile-menu"
></div>
<DropdownMenu {open} onOpenChange={setOpen}>
	<DropdownMenuTrigger
		aria-label="Open profile menu"
		className="fs-relative fs-shrink-0 fl-profile-menu-open-profile-menu"
	>
		<Asset
			type="image"
			src={avatarSrc}
			alt=""
			width={1}
			height={1}
			className="fs-absolute fl-profile-menu-asset"
		/>
	</DropdownMenuTrigger>
	<DropdownMenuContent
		align="end"
		sideOffset={16}
		collisionPadding={8}
		className="fs-box fl-profile-menu-dropdown-menu-conten"
	>
		<div class="fs-pad-md">
			<div class="fs-row fs-ycenter fs-gap-md fs-px-sm fl-profile-menu-div-2">
				<span
					class="fs-relative fs-shrink-0 fl-profile-menu-span"
				>
					<Asset
						type="image"
						src={avatarSrc}
						alt=""
						width={1}
						height={1}
						className="fs-absolute fl-profile-menu-asset-2"
					/>
				</span>
				<span class="fs-minw0 fs-box">
					<span class="fs-text-white fl-profile-menu-span-3">@marcelkargul</span>
					<span class="fs-weight-400 fl-profile-menu-span-4">Personal</span>
				</span>
			</div>
		</div>
		<div aria-hidden="true" class={divider}></div>
		<div class="fl-profile-menu-div-4">
			<DropdownMenuGroup
				className="fs-box fs-px-sm fl-profile-menu-dropdown-menu-group"
			>
				<span class="fs-px-sm fl-profile-menu-span-5"
					>Switch Workspaces</span
				>
				<div class="fs-box fl-profile-menu-div-5">
					<DropdownMenuItem
						className="fs-gap-md fs-px-sm fl-profile-menu-dropdown-menu-item"
						onSelect={() => toast('You’re already in Marcel’s workspace')}
					>
						<span class="fs-row fs-ycenter fs-gap-md">
							<span
								class="fs-relative fs-row fs-ycenter fs-xcenter fs-weight-500 fs-text-white fl-profile-menu-span-7"
							>
								M
							</span>
							<span class="fs-text-white fl-profile-menu-span-8">Marcel’s workspace</span>
						</span>
						<span class="fs-weight-400 fl-profile-menu-span-9">Free</span>
					</DropdownMenuItem>
					<DropdownMenuItem
						className="fs-gap-md fs-px-sm fl-profile-menu-dropdown-menu-item-2"
						onSelect={() =>
							toast('More workspaces are on the Pro plan', {
								description: 'Upgrade to invite teams into separate workspaces.'
							})}
					>
						<span class="fs-row fs-ycenter fs-gap-md">
							<span
								class="fs-row fs-ycenter fs-xcenter fl-profile-menu-span-11"
							>
								<PlusIcon aria-hidden class="fs-text-white fl-profile-menu-plus-icon" />
							</span>
							<span class="fs-weight-500 fl-profile-menu-span-12">Create new</span>
						</span>
						<span
							class="fs-relative fs-row fs-ycenter fs-gap-xs fs-weight-500 fl-profile-menu-span-13"
						>
							<SparklesIcon aria-hidden class="fl-profile-menu-sparkles-icon" />Upgrade
						</span>
					</DropdownMenuItem>
				</div>
			</DropdownMenuGroup>
		</div>
		<div aria-hidden="true" class={divider}></div>
		<DropdownMenuGroup className="fs-box fs-pad-md fl-profile-menu-dropdown-menu-group-2">
			{#each entries as { label, Icon, onSelect } (label)}
				<DropdownMenuItem className={menuItem} {onSelect}>
					<span class="fs-row fs-ycenter fl-profile-menu-span-14"
						><Icon aria-hidden className="fl-profile-menu-icon" /></span
					>
					<span class="fs-grow fs-pr-bs fs-pl-md">{label}</span>
				</DropdownMenuItem>
			{/each}
		</DropdownMenuGroup>
		<div aria-hidden="true" class={divider}></div>
		<div class="fs-px-md fl-profile-menu-div-8">
			<DropdownMenuItem
				className={cn(menuItem)}
				onSelect={() =>
					toast('You’re still signed in', {
						description: 'Logging out is disabled in this preview.'
					})}
			>
				<span class="fs-row fs-ycenter fl-profile-menu-span-16"
					><LogoutIcon aria-hidden class="fl-profile-menu-logout-icon" /></span
				>
				<span class="fs-grow fs-pr-bs fs-pl-md">Logout</span>
			</DropdownMenuItem>
		</div>
	</DropdownMenuContent>
</DropdownMenu>
