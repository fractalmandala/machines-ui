<script lang="ts">
	import './sonner.css';
	import '$lib/styles/palette.css';
	import { Toaster as Sonner, type ToasterProps } from 'svelte-sonner';

	let props: ToasterProps = $props();
</script>

<Sonner
	theme="dark"
	position="bottom-center"
	gap={8}
	toastOptions={{
		unstyled: true,
		classes: {
			toast: 'fl-toast',
			title: 'fl-toast-title',
			description: 'fl-toast-description',
			icon: 'fl-toast-icon',
			success: 'fl-toast-success',
			error: 'fl-toast-error',
			actionButton: 'fl-toast-action'
		}
	}}
	{...props}
/>
