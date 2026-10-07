<!--
@component
A one-month calendar grid with a weekday header, accent-marked days, and an optional boxed today.

@example
```svelte
<GraphCalendar year={2026} month={8} today={27} marks={[12, 18, 27]} />
```
-->

<script module lang="ts">
	import type { GraphPalette } from '../frame/tone.js';

	/** One month grid: weekday header, marked-day accent, optional today. */
	export interface CalendarMark {
		day: number;
		accent?: boolean;
	}

	export interface GraphCalendarProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title?: string;
		/** Four-digit year of the month to draw. */
		year: number;
		/** Month number, 1 for January through 12 for December. */
		month: number;
		/** First day of the week, 0 for Sunday and 1 for Monday. */
		weekStartsOn?: 0 | 1;
		/** Days to accent; each is a day number or a `{ day, accent }` object. */
		marks?: CalendarMark[] | number[];
		/** Day number to draw boxed as today. */
		today?: number;
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
	import { isMonoPalette, toneRole } from '../frame/tone.js';
	import { reveal, stagger } from '../frame/motion.js';

	const WEEKDAYS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
	const WEEKDAYS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
	const MONTHS = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	let {
		title,
		year,
		month,
		weekStartsOn = 1,
		marks,
		today,
		palette,
		corner,
		class: className = ''
	}: GraphCalendarProps = $props();

	function monthLength(year: number, monthIndex: number) {
		return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	}

	function leadingBlanks(year: number, monthIndex: number, weekStartsOn: 0 | 1) {
		const weekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
		return (weekday - weekStartsOn + 7) % 7;
	}

	function markSet(list: GraphCalendarProps['marks']) {
		const map = new Map<number, boolean>();

		if (!list) {
			return map;
		}

		for (const mark of list) {
			if (typeof mark === 'number') {
				map.set(mark, true);
				continue;
			}

			map.set(mark.day, mark.accent ?? true);
		}

		return map;
	}

	const todayRole = $derived(toneRole(palette, isMonoPalette(palette) ? 'primary' : 'secondary'));

	const view = $derived.by(() => {
		const monthIndex = month - 1;
		const days = monthLength(year, monthIndex);
		const pad = leadingBlanks(year, monthIndex, weekStartsOn);
		const highlighted = markSet(marks);
		const headers = weekStartsOn === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN;
		const trailing = (7 - ((pad + days) % 7)) % 7;
		const caption = title ?? `${MONTHS[monthIndex]} ${year}`;
		const grid: (number | null)[] = [
			...Array.from({ length: pad }, () => null),
			...Array.from({ length: days }, (_, index) => index + 1),
			...Array.from({ length: trailing }, () => null)
		];
		const weeks: (number | null)[][] = [];

		for (let index = 0; index < grid.length; index += 7) {
			weeks.push(grid.slice(index, index + 7));
		}

		return { monthIndex, headers, weeks, highlighted, caption };
	});
</script>

<Frame title={view.caption} {corner} class={className}>
	<FrameBody>
		<div class="cal">
			<div class="week head" aria-hidden="true">
				{#each view.headers as header, index (`${header}-${index}`)}
					<span class="day muted">{header}</span>
				{/each}
			</div>
			<div class="weeks" aria-hidden="true">
				{#each view.weeks as week, weekIndex (weekIndex)}
					<div class="week" use:reveal={{ delay: stagger(weekIndex, 40), amount: 0.4 }}>
						{#each week as day, dayIndex (`${weekIndex}-${dayIndex}`)}
							{@const inMonth = day != null}
							{@const accent = day != null && view.highlighted.get(day) === true}
							{@const isToday = day != null && today === day}
							<span
								class="day"
								class:ghost={!inMonth}
								class:c-fg={inMonth && !accent && !isToday}
								class:c-accent={accent || (isToday && !accent && todayRole === 'accent')}
								class:c-accent2={isToday && !accent && todayRole === 'accent2'}
							>
								{inMonth ? (isToday ? `[${day}]` : day) : '\u00a0'}
							</span>
						{/each}
					</div>
				{/each}
			</div>
			<span class="sr-only">
				{MONTHS[view.monthIndex]} {year}{today ? `, today ${today}` : ''}{view.highlighted.size > 0
					? `, marked ${[...view.highlighted.keys()].join(', ')}`
					: ''}
			</span>
		</div>
	</FrameBody>
</Frame>

<style>
	.cal {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.weeks {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.week {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		justify-items: center;
	}

	.day {
		width: 4ch;
		text-align: center;
	}

	.muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

	.ghost {
		color: transparent;
	}

	.c-accent {
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.c-accent2 {
		color: var(--graph-accent-2, oklch(0.78 0.12 70));
	}

	.c-fg {
		color: var(--text-primary, oklch(0.93 0 0));
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
