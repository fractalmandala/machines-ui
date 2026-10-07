<!--
@component
A vertical timeline of dated events, each marked as done, now or next and linked by a rail.

@example
```svelte
<GraphTimeline
  title="SHIPPED"
  events={[
    { date: 'Mar 12', label: 'npm publish' },
    { date: 'Mar 18', label: 'docs, live previews', state: 'now' },
    { date: 'Apr 02', label: '1.0', state: 'next' }
  ]}
/>
```
-->

<script module lang="ts">
	import type { GraphPalette } from '../frame/tone.js';

	/** Progress state of a timeline event. */
	export type TimelineState = 'done' | 'now' | 'next';

	export interface TimelineEvent {
		/** Date or time label for the event. */
		date: string;
		/** What happened at that date. */
		label: string;
		/** Progress state: `done`, `now` (accented), or `next` (muted). */
		state?: TimelineState;
	}

	export interface GraphTimelineProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Events in display order, oldest first. */
		events: TimelineEvent[];
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
	import { reveal, stagger } from '../frame/motion.js';
	import { toneRole, type ToneRole } from '../frame/tone.js';

	const MARK: Record<TimelineState, string> = {
		done: '●',
		now: '●',
		next: '○'
	};

	let {
		title,
		events,
		palette,
		corner,
		class: className = ''
	}: GraphTimelineProps = $props();

	function eventRole(state: TimelineState): ToneRole {
		if (state === 'now') {
			return toneRole(palette, 'primary');
		}

		if (state === 'next') {
			return toneRole(palette, 'secondary');
		}

		return 'foreground';
	}

	function dateRole(state: TimelineState): ToneRole {
		return state === 'next' ? toneRole(palette, 'secondary') : 'foreground';
	}
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<ol class="timeline" role="list">
			{#each events as event, index (`${event.date}-${event.label}`)}
				{@const state = event.state ?? 'done'}
				{@const main = eventRole(state)}
				{@const date = dateRole(state)}
				<li class="event" use:reveal={{ delay: stagger(index, 50), amount: 0.4 }}>
					<div class="line">
						<span
							class="mark"
							aria-hidden="true"
							class:c-accent={main === 'accent'}
							class:c-accent2={main === 'accent2'}
							class:c-muted={main === 'muted'}
							class:c-fg={main === 'foreground'}
						>
							{MARK[state]}
						</span>
						<span
							class="when"
							class:c-accent={date === 'accent'}
							class:c-accent2={date === 'accent2'}
							class:c-muted={date === 'muted'}
							class:c-fg={date === 'foreground'}
						>
							{event.date}
						</span>
						<span
							class="label"
							class:c-accent={main === 'accent'}
							class:c-accent2={main === 'accent2'}
							class:c-muted={main === 'muted'}
							class:c-fg={main === 'foreground'}
						>
							{event.label}
						</span>
					</div>
					{#if index < events.length - 1}
						<div class="link" aria-hidden="true">
							<span class="linkmark">│</span>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	</FrameBody>
</Frame>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.event {
		display: flex;
		flex-direction: column;
	}

	.line {
		display: grid;
		grid-template-columns: 1.25rem 7rem minmax(0, 1fr);
		align-items: baseline;
		column-gap: 1rem;
	}

	.mark {
		text-align: center;
		line-height: 1;
		user-select: none;
	}

	.link {
		display: grid;
		grid-template-columns: 1.25rem 7rem minmax(0, 1fr);
		column-gap: 1rem;
		padding: 0.25rem 0;
		user-select: none;
	}

	.linkmark {
		grid-column: 1;
		text-align: center;
		color: var(--border, oklch(0.6 0 0 / 0.5));
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.c-accent2 {
		color: var(--graph-accent-2, oklch(0.78 0.12 70));
	}

	.c-muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.c-fg {
		color: var(--text-primary, oklch(0.93 0 0));
	}
</style>
