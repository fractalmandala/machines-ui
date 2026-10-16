<script lang="ts">
	import { mode } from './mode.svelte.js';
	import Sun from './Sun.svelte';
	import Moon from './Moon.svelte';

	let { class: className = '' }: { class?: string } = $props();

	// The one mode engine. toggle() defaults to the swipe — the incoming theme
	// wipes over the old one (dark falls from the top, light rises from the
	// bottom, 520ms), and falls back to an instant flip under reduced motion or
	// where view transitions are missing.
	const store = mode();
	const dark = $derived(store.resolved === 'dark');
</script>

<button
	type="button"
	class="row modeToggle {className}"
	class:ondark={dark}
	role="switch"
	aria-checked={dark}
	aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={() => store.toggle()}
>
	<span class="is-icon" class:active={!dark} aria-hidden="true">
		<Sun />
	</span>
	<span class="is-icon" class:active={dark} aria-hidden="true">
		<Moon />
	</span>
</button>

<style lang="sass">

.modeToggle
	position: relative
	display: inline-flex
	align-items: center
	gap: 2px
	padding: 2px
	height: 28px
	background: var(--bg-raised, #F4F4F5)
	border: 1px solid var(--border, #d8d8d8)
	border-radius: var(--radius-full, 9999px)
	cursor: pointer
	box-shadow: 2px 2px 2px rgba(0,0,0,0.6) inset
	font: inherit
	&:focus-visible
		outline: 2px solid var(--ring, rgba(0, 127, 78, 0.35))
		outline-offset: 1px
	&:hover .is-icon:not(.active)
		color: var(--text-primary, #262627)
	.is-icon
		position: relative
		z-index: 1
		display: inline-flex
		align-items: center
		justify-content: center
		width: 22px
		height: 22px
		padding: 0
		border-radius: var(--radius-full, 9999px)
		background: transparent
		color: var(--text-muted, #a3a4a7)
		transition: background var(--motion-fast, 140ms) ease, color var(--motion-fast, 140ms) ease, box-shadow var(--motion-fast, 140ms) ease
		&.active
			background: var(--bg-sunken, #F7F6F0)
			color: var(--text-primary, #262627)
			box-shadow: var(--shadow-sm, 0 1px 2px rgba(15, 23, 42, 0.06))

	&.ondark
		background: var(--bg-raised, #3a3a3a)
		border-color: var(--border, #2f2f2f)
		&:hover .is-icon:not(.active)
			color: var(--text-primary, #EDF2F7)
		.is-icon
			color: var(--text-muted, #7c7c7c)
			&.active
				background: var(--bg-sunken, #1f1f20)
				color: var(--text-primary, #EDF2F7)
				box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.4))

</style>
