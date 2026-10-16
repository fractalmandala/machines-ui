export { default as FlowCanvas } from './components/flow/canvas/flow-canvas.svelte';
export * from './stores/app-store.svelte';
export * from './stores/flow-store.svelte';
export * from './data/automations.js';

// running the open workflow: the canvas's run, driven by the headless engine (also at '@fractaldesign/machines-ui/engine')
export {
	approveStep,
	configureRunner,
	isRunning,
	rejectStep,
	resetRun,
	resumeRun,
	runStore,
	startRun,
	stopRun,
	viewRun
} from './components/flow/canvas/flow-run.js';

// merged markgraphy families: frame, graphs, diagram, animated — the one export
export * from './components/index.js';
