# Agents

Building and enhancing the machines ui library.

> currently, node-graph flow editor with canvas, edges, palette, actions panel
> after enhancing, will also be glyph and frame graph elements, animations, and motion system

## Operating Rules

1. This agent should always be active - `agents/live-proof`. It drives this library's core truth - 2 definitions of "done":
**no feature counts until the user can test it live**
**no component counts until its documentation is live and complete**

The doc of a component IS its proof. typical structure - one line installation code, ex `pnpm add @fractaldesign/machines-ui` + named import from the single entry, live preview view, code view, cli and manual instructions for installation, usage, examples, api reference, motion, notes for ai, related components
**So a component is real, when its doc is real.**

2. Consistency - for any layout we make, any class we set, any size decision - we check, is there a norm for this already? in a similar page, a similar component? We follow the norm, because that harmonizes with our own past selves.

3. Rules set at higher level, the work must be as deterministic, as script-driven, as parallel-agents friendly as possible.

## Structure

1. The new library will be a fresh components library called `@fractaldesign/machines-ui`. We are building it here at `/Users/amrit/fractaldesign/packages/machines-ui`. 
2. Components, ts, files, other requirements of `markgraphy` will be brought here. 

**The app, our notes and comments, naming conventions - nthing shoudl preserve legacy. This is one new project called machines-ui, period. The project does not remember or document its past. (we do during migration, to be removed when done)**

## To Check and Resolve

1. No reference to or dependency on fractalsvelte-ui. Any should be fixed and removed. machines-ui is self sufficient.
2. Any current components directly pulling from bits-ui should be replaced by self-sufficient components at `fs-basics/components`. 
3. One component needs `svelte-motion` replace it with our own motion language.

## Styling

Detailed discussion on this captured here. Below only final conclusions are listed.

1. We will move away from Tailwind.
2. We will use our own styling system, defined by `/Users/amrit/fractaldesign/packages/fractalstyler`. This tree is **canonical**. The older tree at `/Users/amrit/fractalmandala/fractaldev/fractalstyler` is a **read-only mining source** — check it before authoring new class vocabulary, port what exists, never edit it.
3. Class vocabulary rule: every class a component uses must be defined in the canonical tree's styles. Port-first: mining pass (2026-10-06) found only `.switch-thumb` (old tree `_06_visuals.sass:218`, token-driven) among the ~26 names the bits-ui replacements need — port it, author the rest fresh in canonical.
4. Need some steps currently for full tailwind closure and removal.
5. Need to check drift between markgraphy and fractalstyler.

**The library itself will be in CSS** 
User likes SASS, he will build in SASS but finally we should output CSS.
Agent can use CSS/SASS their choice. 
**But alignment is needed on using the same styling system**

Mechanics: agents author Sass under `src/styles/`; a prepack step compiles it to a single `dist/style.css`; component markup carries semantic classes only — no per-component style blocks in shipped components.

## Current Phasing

1. Tooling hardening (in react-tailwind-converter): promote TW_THEME to a real --theme flag, add the junk denylist, add the AST extraction mode for cn()/clsx()/cva call sites — this is exactly the "few careful scripts, parallel-agent-spawnable" layer you described.
2. Merge: markgraphy into packages/machines-ui, single export; both styling systems coexist temporarily.
3. Conversion: machines-ui TW → Sass at scale (tool passes + per-file intervention), screenshot-verified per component with the puppeteer harness.
4. De-Tailwind: swap component markup to the new classes, delete Tailwind build + tw-animate-css; flag: Tailwind's preflight reset disappears with it — fractalstyler's _01_base must absorb that duty or everything shifts a few pixels. Then _ui on fs-basics + Sass (drop bits-ui); motion migration (drop svelte-motion).
5. Token alignment: machines-ui: ↔ markgraphy keeps --graph-* —, rest use one shared token vocabulary across the library.

**Docs site will have to be done in parallel, given where we started from - `agents/live-proof`**

## Immediate Next Step

Spawn 4 agents, to check and fix (shared tree, no worktrees, no git commits):

1 Agent - No reference to or dependency on fractalsvelte-ui. Any should be fixed and removed. machines-ui is self sufficient. This agent owns the only package.json/lockfile edits (remove the dead dep).
2 Agents - Any current components directly pulling from bits-ui should be replaced by self-sufficient components (logic ported from `fs-basics/components`, copied in — never imported from the vendored path). Split: Agent A = Dialog + DropdownMenu families, Agent B = Tooltip + Collapsible + Switch families. Dialog pilots first with behavior parity (focus trap, esc, outside-click, focus return, portal, scroll lock) verified live via the puppeteer harness before the rest. This phase replaces behavior only — do NOT restyle; Tailwind classes in markup stay untouched.
1 Agent - One component needs `svelte-motion` replace it with our own motion language (local, dependency-free tween; do not touch package.json — head agent removes the dep after merge).

Concurrency rules: each agent verifies on its own dev-server port (5173/5174 as assigned); run `npx svelte-check --tsconfig ./tsconfig.json` directly — never `svelte-kit sync` (concurrent agents share `.svelte-kit`).

While these agents work, head Agent works on Phase 1 (merge). 