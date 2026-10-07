<!--
@component
A flow node in two looks: `frame`, our dashed character frame, and `card`, the rounded tinted card of the flow editor. Both take the shared props and show every value; the frame also takes its own dash, movement and corner props, which a card cannot be given. A header, a body, connection ports on any side, and a status with its own colour. It needs no canvas, so it works on any page; a canvas can place it and link it to others.

@example
```svelte
<FlowNode title="CORE" badge="type" status="done">
  <strong>Core Template</strong>
  <p>Triggered when scaffold begins.</p>
</FlowNode>
```
-->

<script module lang="ts">
	import type { Snippet } from 'svelte';
	import type { Dash, Motion, NodePort, Pad, PortId, PortSide, Status } from '../../core/values.js';
	import type { Easing } from '../frame/motion.js';

	/** The props both looks take. */
	export interface FlowNodeBase {
		/** Caption of the node: on the top edge as `[ TITLE ]` in the frame look, the header label in the card look. */
		title: string;
		/** Where the node is in a run. `running` animates it; `done`, `warning` and `error` colour the status from the shared `--success`, `--warning` and `--danger` tokens. Default 'idle'. */
		status?: Status;
		/** Text shown for the status. Defaults to the status's own word; any text works, and `false` hides it. */
		statusLabel?: string | false;
		/** Lights the node up as the current selection: its corners and ports are at full strength, where an unselected node dims them (unless it is running), and the card gets a stronger border. Default false. */
		selected?: boolean;
		/** Short tag at the right of the node header, such as `type` or `IF`. Any text works. */
		badge?: string;
		/** The side the input port is on, or `false` for none. Default 'top'. */
		input?: PortSide | false;
		/** The output ports and the side each leaves from; ports sharing a side are spread evenly along it. Default one `out` port on the bottom. */
		outputs?: NodePort[];
		/** Inner padding of the node. Default 'md'. */
		pad?: Pad;
		/** Colour of the node: its frame corners, title and ports, or its card border, tint, header and ports. Any CSS colour. Defaults to `--graph-accent`. */
		accent?: string;
		/** Icon drawn at the start of the header. */
		icon?: Snippet;
		/** Called when a port is pressed with `in` for the input or the output's id; use it to start a link from a canvas. */
		onportdown?: (port: 'in' | PortId, event: PointerEvent) => void;
		class?: string;
		/** Content rendered inside the component. */
		children?: Snippet;
	}

	/** The props only the frame look takes: its dashed border, how that border moves, and its corner glyphs. */
	export interface FlowNodeFrameOnly {
		/** Dash rhythm of the frame's border. Default 'token'. */
		dash?: Dash;
		/** How the border moves: `march`, `reverse`, `pulse`, `scan` or `draw` (on hover). Left unset, a running node marches and any other node is still; `none` holds a running node still too. */
		motion?: Motion;
		/** Seconds per motion cycle. Defaults per motion (march 0.7, pulse 2, scan 3). */
		speed?: number;
		/** Curve the motion runs on: a name from `EASINGS` or any CSS timing function. */
		easing?: Easing;
		/** Pause the motion while the node is hovered. Default false. */
		pauseOnHover?: boolean;
		/** Blink the corner glyphs. Left unset, a selected node blinks. */
		cornerBlink?: boolean;
		/** Character drawn at each corner of the frame. Default "+". */
		corner?: string;
	}

	/** A node drawn as the dashed character frame: the shared props plus the frame's own. */
	export interface FlowFrameNodeProps extends FlowNodeBase, FlowNodeFrameOnly {
		/** Draw the dashed character frame. This is the default. */
		look?: 'frame';
	}

	/** A node drawn as the rounded tinted card of the flow editor: the shared props only. */
	export interface FlowCardNodeProps extends FlowNodeBase {
		/** Draw the rounded tinted card. */
		look: 'card';
	}

	/** A node's props: what you may set depends on the look. A card takes none of the frame-only ones. */
	export type FlowNodeProps = FlowFrameNodeProps | FlowCardNodeProps;
</script>

<script lang="ts">
	import Frame from '../frame/Frame.svelte';
	import { NODE_DEFAULTS as D, PORT_SIDES, STATUS_TOKENS, statusText } from '../../core/values.js';

	let {
		title,
		look = D.look,
		status = D.status,
		statusLabel,
		selected = D.selected,
		badge,
		input = D.input,
		outputs = [...D.outputs],
		pad = D.pad,
		accent,
		icon,
		onportdown,
		class: className = '',
		children,
		...rest
	}: FlowNodeProps = $props();

	// the frame-only props: a card cannot be given them, so they are read through one narrowing
	const frame = $derived(rest as FlowNodeFrameOnly);
	const dash = $derived(frame.dash ?? D.dash);

	// how the border moves: a running node marches and a selected one blinks, unless the props say otherwise
	const move = $derived(frame.motion ?? (status === 'running' ? 'march' : 'none'));
	const blink = $derived(frame.cornerBlink ?? selected);

	// One resolved model; both looks read only this, never the raw props.
	const model = $derived.by(() => {
		const token = STATUS_TOKENS[status];
		// a warning or an error repaints the whole node in its status colour
		const tone = status === 'warning' || status === 'error' ? token : accent;

		return {
			label: statusText(status, statusLabel),
			lit: selected || status === 'running',
			tone,
			// the middle of the top edge is taken when a port sits there, so the title steps aside
			titleAside: input === 'top' || outputs.some((port) => port.side === 'top'),
			style: [tone ? `--accent:${tone}` : '', token ? `--status:${token}` : ''].filter(Boolean).join(';') || undefined
		};
	});

	// every port on each side, in order, so ports sharing a side can be spread along it
	const sides = $derived(
		PORT_SIDES.map((side) => ({
			side,
			ports: [
				...(input === side ? [{ id: 'in' as const, end: 'in' as const }] : []),
				...outputs.filter((port) => port.side === side).map((port) => ({ id: port.id, end: 'out' as const }))
			]
		})).filter((entry) => entry.ports.length)
	);
</script>

{#snippet ports()}
	{#each sides as { side, ports } (side)}
		{#each ports as port, index (port.id)}
			<span
				class="port"
				data-side={side}
				data-end={port.end}
				style="--at:{((index + 1) / (ports.length + 1)) * 100}%"
				role="presentation"
				onpointerdown={(event) => onportdown?.(port.id, event)}
			></span>
		{/each}
	{/each}
{/snippet}

<div
	class="node {className}"
	data-look={look}
	data-status={status}
	data-selected={selected || undefined}
	data-lit={model.lit || undefined}
	data-pad={pad}
	style={model.style}
>
	{#if look === 'card'}
		<div class="card">
			{#if status === 'running'}<span class="ping" aria-hidden="true"></span>{/if}
			<div class="card-head">
				{#if icon}<span class="card-icon">{@render icon()}</span>{/if}
				<span class="card-title">{title}</span>
				{#if model.label}<span class="pill"><i class="pill-dot"></i>{model.label}</span>{/if}
				{#if badge}<span class="tag">{badge}</span>{/if}
			</div>
			<div class="card-body">{@render children?.()}</div>
		</div>
	{:else}
		<Frame
			{title}
			accent={model.tone}
			titleAlign={model.titleAside ? 'start' : 'center'}
			{pad}
			corner={frame.corner}
			{dash}
			motion={move}
			speed={frame.speed}
			easing={frame.easing}
			pauseOnHover={frame.pauseOnHover}
			cornerBlink={blink}
		>
			{#if icon || model.label || badge}
				<div class="head">
					{#if icon}<span class="head-icon">{@render icon()}</span>{/if}
					{#if model.label}<span class="status">{model.label}</span>{/if}
					{#if badge}<span class="badge">{badge}</span>{/if}
				</div>
			{/if}
			<div class="body">{@render children?.()}</div>
		</Frame>
	{/if}

	{@render ports()}
</div>

<style>
	.node {
		--accent: var(--graph-accent, oklch(0.78 0.17 155));
		/* the colour a status paints its label and dot with */
		--status: var(--accent);
		position: relative;
		min-width: 0;
	}

	/* ── both looks: ports and the dimming of an unselected node ─── */

	.port {
		position: absolute;
		z-index: 11;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		background: var(--accent);
		box-shadow:
			0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent),
			inset 0 0.04rem 0 rgb(255 255 255 / 0.32);
		transform: translate(-50%, -50%);
		user-select: none;
		touch-action: none;
		transition: opacity 150ms;
	}

	/* a port sits on its side, at its share of the way along it */
	.port[data-side='top'] {
		top: 0;
		left: var(--at);
	}

	.port[data-side='bottom'] {
		top: 100%;
		left: var(--at);
	}

	.port[data-side='left'] {
		left: 0;
		top: var(--at);
	}

	.port[data-side='right'] {
		left: 100%;
		top: var(--at);
	}

	.port[data-end='out'] {
		cursor: crosshair;
	}

	/* a wider hit area than the dot */
	.port::before {
		content: '';
		position: absolute;
		inset: -0.5rem;
		border-radius: 50%;
	}

	/* not selected and not running: ports and the frame's corner glyphs go quiet together */
	.node:not([data-lit]) .port,
	.node:not([data-lit]) :global(.corner) {
		opacity: 0.4;
	}

	/* ── frame look ──────────────────────────────────────────────── */

	.head {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.head-icon {
		color: var(--accent);
	}

	.status {
		margin-right: auto;
		color: var(--status);
	}

	.node[data-status='done'] .status::before {
		content: '✓ ';
	}

	.node[data-status='warning'] .status::before {
		content: '! ';
	}

	.node[data-status='error'] .status::before {
		content: '✕ ';
	}

	.head-icon + .status {
		margin-left: 0;
	}

	.badge {
		color: var(--accent);
	}

	.body {
		display: grid;
		gap: 0.25rem;
	}

	.body :global(p) {
		margin: 0;
		color: var(--text-secondary, oklch(0.7 0 0));
	}

	/* ── card look: the flow editor's node ───────────────────────── */

	.card {
		--accent-body: color-mix(in oklab, var(--accent) 14%, #14141a);
		--edge: color-mix(in oklab, var(--accent) 20%, transparent);
		position: relative;
		display: grid;
		gap: 3px;
		padding: 5px 5px 7px;
		border: 1px solid var(--edge);
		border-radius: 12px;
		background-color: color-mix(in oklab, var(--accent) 10%, transparent);
		-webkit-backdrop-filter: blur(16px);
		backdrop-filter: blur(16px);
		color: var(--text-primary, oklch(0.93 0 0));
		font-family: var(--font-sans, system-ui, sans-serif);
		transition:
			border-color 150ms cubic-bezier(0.76, 0, 0.24, 1),
			box-shadow 150ms cubic-bezier(0.76, 0, 0.24, 1);
	}

	.node[data-selected] .card {
		--edge: color-mix(in oklab, var(--accent) 45%, transparent);
	}

	.node[data-status='done'] .card {
		--edge: color-mix(in oklab, var(--accent) 40%, transparent);
	}

	.node[data-status='running'] .card {
		--edge: color-mix(in oklab, var(--accent) 80%, transparent);
		box-shadow: 0 0 32px color-mix(in srgb, var(--accent) 24%, transparent);
	}

	.node[data-status='warning'] .card,
	.node[data-status='error'] .card {
		--edge: color-mix(in oklab, var(--status) 70%, transparent);
	}

	.ping {
		position: absolute;
		inset: -1px;
		border-radius: inherit;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 60%, transparent);
		pointer-events: none;
		animation: node-ping 1.2s cubic-bezier(0.25, 1, 0.5, 1) infinite;
	}

	.card-head {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.25rem;
		padding: 0.375rem 0.3125rem;
	}

	.card-icon {
		display: inline-flex;
		width: 1.125rem;
		height: 1.125rem;
		align-items: center;
		justify-content: center;
		color: var(--accent);
	}

	.card-title {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.5rem;
		color: var(--accent);
	}

	.pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		height: 1.25rem;
		padding: 0 0.5rem;
		border-radius: 999px;
		background-color: color-mix(in oklab, var(--status) 12%, transparent);
		font-size: 0.75rem;
		font-weight: 550;
		color: var(--status);
	}

	.pill-dot {
		width: 0.375rem;
		height: 0.375rem;
		border-radius: 50%;
		background: var(--status);
	}

	.node[data-status='running'] .pill-dot {
		animation: node-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		height: 1.25rem;
		padding: 0 0.5625rem;
		border-radius: 21px;
		background-color: color-mix(in oklab, var(--accent) 15%, transparent);
		box-shadow:
			inset 0 1px 0 rgb(255 255 255 / 0.08),
			inset 0 0 0 1px rgb(253 253 255 / 0.04);
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--accent);
		text-shadow: 0 -1px 0.25px rgb(0 0 0 / 0.32);
	}

	.card-body {
		display: grid;
		gap: 0.25rem;
		padding: 0.625rem 0.875rem;
		border-radius: 10px;
		background-color: var(--accent-body);
		font-size: 0.875rem;
		line-height: 1.25rem;
	}

	/* the card sets its own text size; a page's global p and strong rules do not apply inside it */
	.card-body :global(strong),
	.card-body :global(p) {
		font-size: inherit;
		line-height: inherit;
		font-family: inherit;
	}

	.card-body :global(strong) {
		font-weight: 600;
		color: #fff;
	}

	.card-body :global(p) {
		margin: 0;
		font-weight: 500;
		color: color-mix(in oklab, #fff 40%, transparent);
	}

	/* inner padding of the card's body */
	.node[data-pad='none'] .card-body {
		padding: 0.25rem 0.5rem;
	}

	.node[data-pad='sm'] .card-body {
		padding: 0.5rem 0.625rem;
	}

	.node[data-pad='lg'] .card-body {
		padding: 0.875rem 1.125rem;
	}

	@keyframes node-ping {
		0% {
			opacity: 0.9;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(1.035, 1.09);
		}
	}

	@keyframes node-pulse {
		50% {
			opacity: 0.5;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.ping,
		.node[data-status='running'] .pill-dot {
			animation: none;
		}
	}
</style>
