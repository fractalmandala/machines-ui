import {
	SEED_GRAPHS,
	blankGraph,
	seedAutomations,
	type Automation,
	type AutomationStatus
} from '$lib/data/automations.js';
import { exportGraph, loadGraph } from './flow-store.svelte.js';

export type Screen = 'dashboard' | 'automations' | 'editor';

export type EditorTab = 'overview' | 'flow' | 'settings' | 'export';

export type AutomationSettings = {
	senderName: string;
	replyTo: string;
	quietHours: boolean;
	quietFrom: string;
	quietTo: string;
	timezone: string;
	reentry: boolean;
	exitOnUnsubscribe: boolean;
	skipWeekends: boolean;
	goal: string;
	shareLink: boolean;
};

export const DEFAULT_SETTINGS: AutomationSettings = {
	senderName: 'Machines',
	replyTo: 'hello@example.com',
	quietHours: true,
	quietFrom: '21:00',
	quietTo: '08:00',
	timezone: 'Workspace timezone',
	reentry: false,
	exitOnUnsubscribe: true,
	skipWeekends: false,
	goal: 'Opens the first lesson',
	shareLink: false
};

export const STATUS_LABEL: Record<AutomationStatus, string> = {
	draft: 'Draft',
	running: 'Running',
	paused: 'Paused'
};

export const app = $state({
	screen: 'editor' as Screen,
	tab: 'flow' as EditorTab,
	automationId: 'jev',
	automations: seedAutomations(Date.now()) as Automation[],
	settings: {} as Record<string, AutomationSettings>,
	sidebarOpen: false,
	renameRequest: 0
});

const touch = (id: string) => {
	const automation = app.automations.find((item) => item.id === id);
	if (automation) automation.updatedAt = Date.now();
};

export function openScreen(screen: Screen) {
	app.screen = screen;
}

export function openAutomation(id: string, tab: EditorTab = 'flow') {
	loadGraph(id, SEED_GRAPHS[id] ?? (() => blankGraph(id)));
	app.screen = 'editor';
	app.automationId = id;
	app.tab = tab;
}

export function setTab(tab: EditorTab) {
	app.tab = tab;
}

export function toggleSidebar() {
	app.sidebarOpen = !app.sidebarOpen;
}

export function createAutomation() {
	const id = `automation-${crypto.randomUUID().slice(0, 8)}`;
	const now = Date.now();
	app.automations.unshift({
		id,
		name: 'Untitled automation',
		description: 'Describe what this automation does',
		status: 'draft',
		category: 'agents',
		started: 0,
		finished: 0,
		createdAt: now,
		updatedAt: now
	});
	loadGraph(id, () => blankGraph(id));
	app.screen = 'editor';
	app.automationId = id;
	app.tab = 'flow';
	app.renameRequest++;
}

export function updateAutomation(
	id: string,
	patch: Partial<Pick<Automation, 'name' | 'description' | 'status'>>
) {
	const automation = app.automations.find((item) => item.id === id);
	if (automation) Object.assign(automation, patch, { updatedAt: Date.now() });
}

export function duplicateAutomation(id: string) {
	const source = app.automations.find((item) => item.id === id);
	if (!source) return;
	const copyId = `automation-${crypto.randomUUID().slice(0, 8)}`;
	const graph = exportGraph(id);
	const now = Date.now();
	app.automations.unshift({
		...source,
		id: copyId,
		name: `${source.name} (copy)`,
		status: 'draft',
		started: 0,
		finished: 0,
		createdAt: now,
		updatedAt: now
	});
	if (app.settings[id]) app.settings[copyId] = app.settings[id];
	const suffix = copyId.slice(-8);
	loadGraph(copyId, () => ({
		nodes: graph.nodes.map((node) => ({
			...node,
			id: `${node.id}-${suffix}`,
			fresh: false
		})),
		edges: graph.edges.map((edge) => ({
			...edge,
			id: `${edge.id}-${suffix}`,
			source: `${edge.source}-${suffix}`,
			target: `${edge.target}-${suffix}`
		}))
	}));
	app.screen = 'editor';
	app.automationId = copyId;
	app.tab = 'flow';
}

export function deleteAutomation(id: string) {
	app.automations = app.automations.filter((item) => item.id !== id);
	app.screen = 'automations';
	const fallback = app.automations[0];
	if (fallback && app.automationId === id) {
		loadGraph(fallback.id, SEED_GRAPHS[fallback.id] ?? (() => blankGraph(fallback.id)));
		app.automationId = fallback.id;
	}
}

export function updateSettings(id: string, patch: Partial<AutomationSettings>) {
	app.settings[id] = { ...(app.settings[id] ?? DEFAULT_SETTINGS), ...patch };
	touch(id);
}
