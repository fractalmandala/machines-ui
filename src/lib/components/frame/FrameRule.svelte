<!--
@component
A horizontal dashed rule that spans the frame, for separating sections inside a FrameBody.

@example
```svelte
<Frame title="RULE">
  <FrameBody>
    <p>Above the rule</p>
    <FrameRule />
    <p>Below the rule</p>
  </FrameBody>
</Frame>
```
-->

<script module lang="ts">
	export interface GraphRuleProps {
		class?: string;
	}
</script>

<script lang="ts">
	let { class: className = '' }: GraphRuleProps = $props();
</script>

<div class="rule {className}" aria-hidden="true"></div>

<style>
	.rule {
		width: 100%;
		height: 1px;
		background-image: repeating-linear-gradient(
			to right,
			var(--border, oklch(0.6 0 0 / 0.5)) 0 2px,
			transparent 2px 7px
		);
	}
</style>
