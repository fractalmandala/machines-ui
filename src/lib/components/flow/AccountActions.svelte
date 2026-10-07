<script module lang="ts">
	import './AccountActions.css';
	import { toast } from 'svelte-sonner';
	import Button from '$lib/components/ui/button.svelte';
	import HelpIcon from '$lib/icons/topbar/help.svelte';
	import ShareIcon from '$lib/icons/topbar/share.svelte';
	import ProfileMenu from './profile-menu/profile-menu.svelte';

	type EditorTopbarProps = {
		avatarSrc: string;
	};
</script>

<script lang="ts">
	let { avatarSrc }: EditorTopbarProps = $props();
</script>

<Button
	variant="field"
	size="field"
	className="fl-account-actions"
	onClick={() =>
		toast('Need a hand?', {
			description: 'Our team replies in about 5 minutes on weekdays.',
			action: { label: 'Open chat', onClick: () => toast.success('Chat opened in a new window') }
		})}
>
	<HelpIcon aria-hidden class="fl-account-actions-help-icon" />
	<span class="fs-pr-xs">Help</span>
</Button>
<Button
	variant="field"
	size="field"
	className="fl-account-actions-button"
	onClick={() => {
		navigator.clipboard?.writeText('https://example.com/r/invite').catch(() => {});
		toast.success('Referral link copied', {
			description: 'Earn a free month for every writer who joins.'
		});
	}}
>
	<ShareIcon aria-hidden class="fl-account-actions-share-icon" />
	<span class="fs-pr-xs">Share & earn</span>
</Button>
<ProfileMenu {avatarSrc} />
