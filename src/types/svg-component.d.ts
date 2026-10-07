// Type stub for `$lib/svg/*` imports (wired via tsconfig `paths`).
// The Vite plugin @poppanator/sveltekit-svg turns these imports into Svelte
// components at build time; this file gives them a component type for TS.
import type { Component } from 'svelte';

declare const SvgComponent: Component<Record<string, unknown>>;

export default SvgComponent;
