<!--
@component
A GitHub-style contribution grid: one cell per day, weeks across the frame, on a shared intensity scale.

@example
```svelte
<script lang="ts">
	import { GraphActivity } from '@fractaldesign/machines-ui';

	// Pass dated counts; weeks, months, and intensity are derived.
</script>

<GraphActivity
  title="COMMITS"
  palette="multi"
  days={[
    { date: '2025-09-01', count: 3 },
    { date: '2025-09-02', count: 12 }
    // ...one per day, gaps fill as empty
  ]}
/>
```
-->

<script module lang="ts">
	import type { Glyphs } from '../frame/glyphs.js';
	import type { GraphPalette } from '../frame/tone.js';

	/** GitHub-style contribution grid: weeks across the frame, days down. */
	export interface ActivityDay {
		date: string;
		count: number;
	}

	export interface GraphActivityProps {
		/** Caption drawn on the top edge as `[ TITLE ]`. Uppercase, 1–2 words. */
		title: string;
		/** Dated counts, one per day; gaps between dates fill in as empty. */
		days: ActivityDay[];
		/** First day of the week, 0 for Sunday and 1 for Monday. */
		weekStartsOn?: 0 | 1;
		/** Ceiling of the intensity scale; defaults to the highest count. */
		max?: number;
		/** Show the intensity legend below the grid. */
		legend?: boolean;
		/** Extra sentence appended to the contribution summary. */
		caption?: string | false;
		/** Characters that draw the graph: a preset name (`shade`, `ascii`, `hash`, `bar`) or your own array, lightest to heaviest. */
		glyphs?: Glyphs;
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
	import { intensityGlyph, intensityLevel, resolveGlyphs } from '../frame/glyphs.js';
	import { intensityRole } from '../frame/tone.js';
	import type { ToneRole } from '../frame/tone.js';
	import { reveal, stagger } from '../frame/motion.js';

	const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	const DAY_MS = 86_400_000;

	let {
		title,
		days,
		weekStartsOn = 0,
		max,
		legend = true,
		caption,
		glyphs,
		palette,
		corner,
		class: className = ''
	}: GraphActivityProps = $props();

	type Cell = { date: string; count: number; inRange: boolean };

	function parseUTC(iso: string) {
		const [year, month, day] = iso.split('-').map(Number);
		return Date.UTC(year, month - 1, day);
	}

	function toISO(utc: number) {
		return new Date(utc).toISOString().slice(0, 10);
	}

	function buildWeeks(list: ActivityDay[], start: 0 | 1) {
		if (list.length === 0) {
			return [] as Cell[][];
		}

		const counts = new Map<string, number>();
		let min = Number.POSITIVE_INFINITY;
		let maxTime = Number.NEGATIVE_INFINITY;

		for (const day of list) {
			const time = parseUTC(day.date);
			counts.set(day.date, day.count);
			if (time < min) min = time;
			if (time > maxTime) maxTime = time;
		}

		const lead = (new Date(min).getUTCDay() - start + 7) % 7;
		const trail = (start + 6 - new Date(maxTime).getUTCDay() + 7) % 7;
		const first = min - lead * DAY_MS;
		const last = maxTime + trail * DAY_MS;
		const weeks: Cell[][] = [];
		let week: Cell[] = [];

		for (let time = first; time <= last; time += DAY_MS) {
			const date = toISO(time);
			const inRange = time >= min && time <= maxTime;
			week.push({
				date,
				count: inRange ? (counts.get(date) ?? 0) : 0,
				inRange
			});
			if (week.length === 7) {
				weeks.push(week);
				week = [];
			}
		}

		return weeks;
	}

	function monthLabels(weeks: Cell[][]) {
		return weeks.map((week) => {
			const start = week.find((cell) => {
				if (!cell.inRange) {
					return false;
				}

				return new Date(parseUTC(cell.date)).getUTCDate() === 1;
			});

			if (!start) {
				return '';
			}

			return MONTHS[new Date(parseUTC(start.date)).getUTCMonth()] ?? '';
		});
	}

	function dayLabels(start: 0 | 1) {
		return start === 1 ? ['M', '', 'W', '', 'F', '', ''] : ['', 'M', '', 'W', '', 'F', ''];
	}

	const set = $derived(resolveGlyphs(glyphs));
	const weeks = $derived(buildWeeks(days, weekStartsOn));
	const months = $derived(monthLabels(weeks));
	const labels = $derived(dayLabels(weekStartsOn));
	const peak = $derived(max ?? Math.max(0, ...days.map((day) => day.count), 0));
	const total = $derived(days.reduce((sum, day) => sum + day.count, 0));
	const summary = $derived(`${total.toLocaleString('en-US')} contributions`);
	const quiet = $derived(set[0] ?? '·');

	const scale = $derived(
		set.map((glyph, index) => ({
			glyph,
			key: `${glyph}-${index}`,
			role: intensityRole(Math.round((index / Math.max(set.length - 1, 1)) * 4), palette)
		}))
	);

	const view = $derived(
		weeks.map((week) => ({
			key: week[0]?.date ?? '',
			cells: week.map((cell) => {
				const level = cell.inRange ? intensityLevel(cell.count, peak) : 0;
				return {
					date: cell.date,
					glyph: cell.inRange ? intensityGlyph(level, set) : quiet,
					role: (cell.inRange ? intensityRole(level, palette) : 'ghost') as ToneRole | 'ghost'
				};
			})
		}))
	);
</script>

<Frame {title} {corner} class={className}>
	<FrameBody>
		<div class="fs-box">
			<div class="fs-box fs-gap-sm">
				<div class="fs-row fs-xevenly">
					{#each months as month, index (`m-${index}`)}
							{#if month}
								<span class="fs-text-muted">{month}</span>
							{/if}
					{/each}
				</div>
				<div class="fs-row">
					<div class="fs-box fs-yevenly pad-right-2xs">
						{#each labels as label, index (`d-${index}`)}
							<span class="fs-text-muted">{label}</span>
						{/each}
					</div>
					<div class="fs-row fs-xevenly fs-wfull">
						{#each view as week, weekIndex (week.key || weekIndex)}
							<div
								class="fs-box"
								use:reveal={{ delay: stagger(weekIndex, 10), amount: 0.2 }}
							>
								{#each week.cells as cell (cell.date)}
									<span
										class="dcell"
										class:ghost={cell.role === 'ghost'}
										class:c-frame={cell.role === 'empty'}
										class:c-muted={cell.role === 'muted'}
										class:c-fg={cell.role === 'foreground'}
										class:c-accent={cell.role === 'accent'}
										class:c-accent2={cell.role === 'accent2'}
										class:c-accent3={cell.role === 'accent3'}
									>
										{cell.glyph}
									</span>
								{/each}
							</div>
						{/each}
					</div>
				</div>
			</div>
			<span class="fs-text-muted">
				{total} contributions across {days.length} days{caption ? `. ${caption}` : ''}
			</span>
		</div>
	</FrameBody>
</Frame>

<style>
	.dcell {
		display: flex;
		width: 100%;
		height: 1.15em;
		align-items: center;
		justify-content: center;
		line-height: 1;
		user-select: none;
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

	.c-accent3 {
		color: var(--graph-accent-3, oklch(0.72 0.13 30));
	}

	.c-frame {
		color: var(--border, oklch(0.6 0 0 / 0.5));
	}

	.c-fg {
		color: var(--text-primary, oklch(0.93 0 0));
	}

	.c-muted {
		color: var(--text-secondary, oklch(0.62 0 0));
	}

</style>
