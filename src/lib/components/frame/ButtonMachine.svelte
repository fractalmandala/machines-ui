<!--
@component
A button drawn as a dashed frame with the label set in a block of the current accent. The label turns black or white to stay readable on whatever the accent is. Pass `href` and it renders a link.

@example
```svelte
<ButtonMachine onclick={() => console.log('run')}>Run</ButtonMachine>
```

@example
```svelte
<ButtonMachine href="/docs">Docs</ButtonMachine>
```
-->

<script module lang="ts">
	import './button-machine.css';
	import type { Snippet } from 'svelte';

	export interface ButtonMachineProps {
		/** Makes it a link: an `<a>` with this address instead of a `<button>`. */
		href?: string;
		/** The `type` of the `<button>`. Not used when `href` is set. Default 'button'. */
		type?: 'button' | 'submit' | 'reset';
		/** Disables the `<button>`. Not used when `href` is set. Default false. */
		disabled?: boolean;
		/** Called when the button or link is clicked. */
		onclick?: (event: MouseEvent) => void;
		/** Extra classes on the outer element. */
		class?: string;
		/** The label. */
		children?: Snippet;
	}
</script>

<script lang="ts">
	let { href, type = 'button', disabled = false, onclick, class: className = '', children }: ButtonMachineProps = $props();
</script>

{#if href}
	<a class="button-machine {className}" {href} {onclick}><span class="button-machine-inside">{@render children?.()}</span></a>
{:else}
	<button class="button-machine {className}" {type} {disabled} {onclick}><span class="button-machine-inside">{@render children?.()}</span></button>
{/if}
