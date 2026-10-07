# machines-ui

Svelte 5 components drawn with characters: graphs, animated terminals, diagrams, and a node-and-edge workflow builder. Dashed frames, block glyphs, monospace type.

- **Docs and live examples:** <https://machines.fractalsvelte.dev>
- **Source:** <https://github.com/fractalmandala/machines-ui>

## Install

```sh
pnpm add @fractaldesign/machines-ui
```

Needs Svelte 5. It does not need SvelteKit: a plain Vite + Svelte app works.

## Use

Import the stylesheet once, then import components from the package entry.

```svelte
<script lang="ts">
	import '@fractaldesign/machines-ui/style.css';
	import { GraphKpi, GraphMeter } from '@fractaldesign/machines-ui';
</script>

<GraphKpi title="READS" value="12,400" label="this week" hint="+18%" data={[4, 5, 6, 8, 9, 12]} />
<GraphMeter title="QUOTA" value={0.64} caption="storage used" />
```

## What is in it

| Family   | What it is                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frame    | The dashed character frame every graph sits in, and its parts.          |
| Graphs   | Stats, charts, tables, timelines and more, drawn with glyphs.           |
| Animated | Terminals, rain, fire, life and live readouts.                          |
| Diagram  | Flows, trees and system diagrams.                                       |
| Flow     | Nodes, edges and the canvas of the workflow builder.                    |

Every component has a page with its props, defaults, types and a live example: <https://machines.fractalsvelte.dev/docs>.

## Workflow builder

`FlowCanvas` is the node canvas with its actions panel and step inspector. State lives in the exported `flow` store; `loadGraph` opens a graph and `SEED_GRAPHS` holds ten sample workflows.

```svelte
<script lang="ts">
	import '@fractaldesign/machines-ui/style.css';
	import { FlowCanvas, loadGraph, SEED_GRAPHS } from '@fractaldesign/machines-ui';

	loadGraph('jev', SEED_GRAPHS.jev);
</script>

<div style="height: 40rem">
	<FlowCanvas />
</div>
```

Give it a container with an explicit height. A single node is also available on its own as `FlowNode`, drawn as a dashed frame or a card.

## Theming

Graphs read a handful of CSS custom properties (`--border`, `--text-primary`, `--text-secondary`, `--text-muted`, `--bg`, `--font-sans`, `--font-mono`). The stylesheet supplies a dark set scoped to `.graph`, so it never paints your page. If your app already defines those tokens, add `data-graph-native-tokens` to a frame or an ancestor and the fallbacks step aside.

The accent is one palette of 18 colours. Choosing one sets `--graph-accent`, `--graph-accent-2` and `--graph-accent-3` on `<html>`, and every graph follows.

## Motion

Animated components stop when the user prefers reduced motion.

## License

MIT. See [LICENSE](./LICENSE).
