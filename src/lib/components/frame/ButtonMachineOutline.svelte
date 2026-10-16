<!--
@component
The quiet cousin of `ButtonMachine`: the same dashed frame with no block behind the label. On hover the frame and the label take the current accent. Pass `href` and it renders a link.

@example
```svelte
<ButtonMachineOutline onclick={() => console.log('open')}>Open</ButtonMachineOutline>
```

@example
```svelte
<ButtonMachineOutline href="/docs/examples">Examples</ButtonMachineOutline>
```
-->

<script module lang="ts">
	import './button-machine.css';
	import type { Snippet } from 'svelte';

	export interface ButtonMachineOutlineProps {
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
	let { href, type = 'button', disabled = false, onclick, class: className = '', children }: ButtonMachineOutlineProps = $props();
</script>

{#if href}
	<a class="button-machine {className}" {href} {onclick}><span class="button-machine-label">{@render children?.()}</span></a>
{:else}
	<button class="button-machine {className}" {type} {disabled} {onclick}><span class="button-machine-label">{@render children?.()}</span></button>
{/if}
