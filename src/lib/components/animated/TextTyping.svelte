<!--
@component
Types a line of text one character at a time, restarting when the text changes or the line becomes active again.

@example
```svelte
<TextTyping textToAnimate="Rendering the diagram…" duration={900} />
```
-->

<script module lang="ts">
	export interface TextTypingProps {
		/** The full line to type; its characters are revealed in order. */
		textToAnimate: string;
		/**
		 * Types only while true. Flip it on and the line types from empty; flip
		 * it off and the full text is shown at once. Anything not currently
		 * being animated should read its label plainly, not re-type.
		 */
		active?: boolean;
		/**
		 * Optional extra dependency. Change it to re-type while already active —
		 * for a loop that returns to the same item, say.
		 */
		trigger?: unknown;
		/** Milliseconds for a full line. Default 900. */
		duration?: number;
	}
</script>

<script lang="ts">
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	let {
		textToAnimate = 'this is the one',
		active = true,
		trigger,
		duration = 900
	}: TextTypingProps = $props();

	// The tween's pace is fixed at construction by design; changing the prop
	// later should not re-pace a line that is already typing.
	// svelte-ignore state_referenced_locally
	const progress = new Tween(0, { duration, easing: cubicOut });

	$effect(() => {
		// Each of these is a dependency: becoming active, new text, or an
		// explicit trigger all restart the line.
		void trigger;
		void textToAnimate;

		if (!active || prefersReducedMotion.current) {
			progress.set(1, { duration: 0 });

			return;
		}

		// duration 0 aborts any in-flight tween and snaps to the start, so a
		// change mid-type restarts cleanly instead of resuming part-way.
		progress.set(0, { duration: 0 });
		progress.target = 1;
	});

	const shown = $derived(
		textToAnimate.slice(0, Math.round(textToAnimate.length * progress.current))
	);
</script>

<p>{shown}</p>
