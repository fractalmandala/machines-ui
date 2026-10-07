// The shared vocabulary of the library: the value lists, defaults, words and colours
// that frames, cards, nodes, edges and the docs all agree on. Types are derived from
// the lists, so a value added here exists everywhere at once. Nothing in this file
// imports from a component.

// ── Look: how a box is drawn ──────────────────────────────────────────────────

/** `frame` is the dashed character frame; `card` is the rounded tinted card of the flow editor. */
export const LOOKS = ['frame', 'card'] as const;
export type Look = (typeof LOOKS)[number];

// ── Dash: the rhythm of a dashed line ─────────────────────────────────────────

/**
 * Every dash rhythm, as drawn pixels then empty pixels:
 * `token` 4/4 (the theme can change it), `std` 8/8, `gap` 4/12, `short` 2/2,
 * `long` 12/12, `dot` 1/3, `alt` 2/3/8/3 (short, long), `solid` unbroken.
 */
export const DASHES = ['token', 'std', 'gap', 'long', 'short', 'dot', 'alt', 'solid'] as const;
export type Dash = (typeof DASHES)[number];

/** Each dash as an SVG `stroke-dasharray`, the same rhythm the frame paints with CSS. */
export const DASH_ARRAYS: Record<Dash, string | undefined> = {
	token: '4 4',
	std: '8 8',
	gap: '4 12',
	long: '12 12',
	short: '2 2',
	dot: '1 3',
	alt: '2 3 8 3',
	solid: undefined
};

// ── Motion: how a frame's border moves ────────────────────────────────────────

/**
 * `march` marching ants, clockwise; `reverse` the same counter-clockwise; `pulse` dashes drift
 * out and back; `scan` a sweep of light travels around the frame; `draw` the frame draws itself
 * in on hover (no loop). Every loop is off under `prefers-reduced-motion`.
 */
export const MOTIONS = ['none', 'march', 'reverse', 'pulse', 'scan', 'draw'] as const;
export type Motion = (typeof MOTIONS)[number];

/** Inner padding of a frame or card. */
export const PADS = ['none', 'sm', 'md', 'lg'] as const;
export type Pad = (typeof PADS)[number];

/** Corner glyphs the docs and playground offer. Any character is valid. */
export const CORNERS = ['+', '·', '◆', '×', '□', '*'] as const;

// ── Status: where a node is in a run ──────────────────────────────────────────

/** `idle` has not run; `running` is in progress; `done` finished; `warning` and `error` need attention. */
export const STATUSES = ['idle', 'running', 'done', 'warning', 'error'] as const;
export type Status = (typeof STATUSES)[number];

/** What each status says when no label is given. An idle node says nothing. */
export const STATUS_LABELS: Record<Status, string> = {
	idle: '',
	running: 'Running',
	done: 'Done',
	warning: 'Warning',
	error: 'Error'
};

/** The colour each status paints its label and dot with, from the shared tokens. */
export const STATUS_TOKENS: Partial<Record<Status, string>> = {
	done: 'var(--success, #34d399)',
	warning: 'var(--warning, #fbbf24)',
	error: 'var(--danger, #f87171)'
};

/** The text a node shows for its status: the label if given, `false` hides it, otherwise the status's own word. */
export function statusText(status: Status, label: string | false | undefined): string {
	return label === false ? '' : (label ?? STATUS_LABELS[status]);
}

// ── Ports: where a connection leaves or enters ────────────────────────────────

/** Which output a connection leaves from: `out` is the usual one, a branch has `true` and `false`. */
export const PORT_IDS = ['out', 'true', 'false'] as const;
export type PortId = (typeof PORT_IDS)[number];

/** Which side of a node a port sits on. */
export const PORT_SIDES = ['top', 'right', 'bottom', 'left'] as const;
export type PortSide = (typeof PORT_SIDES)[number];

/** An output port: which output it is, and the side it sits on. */
export interface NodePort {
	id: PortId;
	side: PortSide;
}

// ── Node: defaults and the words and colours offered for it ───────────────────

/** What every optional node prop falls back to. Bottom is where an output leaves from by default. */
export const NODE_DEFAULTS = {
	look: 'frame' as Look,
	status: 'idle' as Status,
	selected: false,
	/** The side of the input port, or `false` for none. */
	input: 'top' as PortSide | false,
	outputs: [{ id: 'out', side: 'bottom' }] as readonly NodePort[],
	dash: 'token' as Dash,
	/** Inner padding. */
	pad: 'md' as Pad
};

/** Badge words the docs and playground offer. Any text is valid. */
export const BADGES = ['IF', 'type', 'interface', 'schema', 'config'] as const;

/**
 * The accent palette: the one list of colours a node, a wire or the site can be painted with.
 * The ten site colours come first, then the flow editor's eight, one per kind of step (their ids
 * are the step kinds). Every picker, swatch, default and stylesheet reads this list; nothing else
 * in the package may spell one of these colours. `scripts/lint-palette.mjs` enforces that, and
 * `scripts/build-palette.mjs` writes the stylesheet form (`styles/palette.css`) from it.
 */
export const ACCENTS = [
	{ id: 'orange', name: 'orange', value: '#FF3E00' },
	{ id: 'amber', name: 'amber', value: '#e67700' },
	{ id: 'olive', name: 'olive', value: '#5c940d' },
	{ id: 'green', name: 'green', value: '#2f9e44' },
	{ id: 'teal', name: 'teal', value: '#087f5b' },
	{ id: 'cyan', name: 'cyan', value: '#1098ad' },
	{ id: 'blue', name: 'blue', value: '#1971c2' },
	{ id: 'violet', name: 'violet', value: '#862e9c' },
	{ id: 'pink', name: 'pink', value: '#c2255c' },
	{ id: 'red', name: 'red', value: '#c92a2a' },
	{ id: 'trigger', name: 'trigger', value: '#9875ff' },
	{ id: 'send-email', name: 'send email', value: '#75caff' },
	{ id: 'update-subscription', name: 'update subscription', value: '#75ff77' },
	{ id: 'send-webhook', name: 'send webhook', value: '#ffb575' },
	{ id: 'wait-until', name: 'wait until', value: '#ff75e3' },
	{ id: 'time-delay', name: 'time delay', value: '#ff7575' },
	{ id: 'branch', name: 'branch', value: '#75ffd3' },
	{ id: 'enroll', name: 'enroll', value: '#75aaff' }
] as const;

export type AccentId = (typeof ACCENTS)[number]['id'];

/** The colour of one accent. */
export function accentOf(id: AccentId): string {
	return ACCENTS.find((accent) => accent.id === id)!.value;
}

/** The custom property each accent is published under in `styles/palette.css`. */
export const accentVar = (id: AccentId) => `var(--fl-accent-${id})`;
