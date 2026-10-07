<!--
@component

@example
```svelte
<GraphCountdown
  title="FREEZE"
  to="2027-01-01T00:00:00Z"
  done="open"
  caption="until launch"
/>
```
-->

<script module lang="ts">
	import type { GraphPalette } from '../frame/tone.js';

	/** Time left until a date. */
	export interface GraphCountdownProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Date, timestamp, or date string to count down to. */
		to: Date | number | string;
		/** Text shown instead of the timer once the target time has passed. */
		done?: string;
		/** Optional text displayed beneath the remaining time. */
		caption?: string;
		/** How many accent colours the graph uses: `mono` one, `duo` two, `multi` three. */
		palette?: GraphPalette;
		/** Character drawn at each corner of the frame. */
		corner?: string;
		class?: string;
	}
</script>

<script lang="ts">
	import Frame from '../frame/Frame.svelte';
	import FrameBody from '../frame/FrameBody.svelte';
	import { formatHms, graphNow, parseInstant } from '../frame/clock.js';
	import { reveal } from '../frame/motion.js';

	let {
		title,
		to,
		done = 'done',
		caption,
		palette,
		corner,
		class: className = ''
	}: GraphCountdownProps = $props();

	const time = graphNow();
	const target = $derived(parseInstant(to));

	const view = $derived.by(() => {
		const remaining = $time == null || !Number.isFinite(target) ? null : target - $time;
		const finished = remaining != null && remaining <= 0;
		const value = remaining == null ? '00:00:00' : finished ? done : formatHms(remaining);
		return { value, finished };
	});
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="countdown" use:reveal={{ amount: 0.5 }}>
			<p class="value" class:c-accent={!view.finished} class:muted={view.finished}>
				{view.value}
			</p>
			{#if caption}
				<p class="muted">{caption}</p>
			{/if}
		</div>
		<span class="sr-only">{view.finished ? done : `remaining ${view.value}`}</span>
	</FrameBody>
</Frame>

<style>
	.countdown {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.value {
		margin: 0;
		font-size: 1.875rem;
		line-height: 1.2;
		letter-spacing: -0.025em;
	}

	@media (min-width: 640px) {
		.value {
			font-size: 2.25rem;
		}
	}

	.muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border-width: 0;
	}
</style>
