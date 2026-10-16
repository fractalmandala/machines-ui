import type {
	ActionKind,
	NodeView,
	PortId,
	FlowEdge,
	FlowNodeData
} from '$lib/stores/flow-store.svelte.js';
import { accentOf, type Dash } from '$lib/core/values.js';

export type AutomationStatus = 'draft' | 'running' | 'paused';

export type AutomationCategory = 'agents' | 'data' | 'knowledge';

export type AutomationGraph = { nodes: FlowNodeData[]; edges: FlowEdge[] };

export type Automation = {
	id: string;
	name: string;
	description: string;
	status: AutomationStatus;
	category: AutomationCategory;
	/** Runs started. */
	started: number;
	/** Runs finished. */
	finished: number;
	createdAt: number;
	updatedAt: number;
};

// The sample flows below are the app's examples. Between them they use every prop a flow
// node and a flow edge take: both looks, every dash, motion, easing, corner, badge, status,
// padding, port side and wire colour. Nodes sit on a grid: a column is 480px, a row 200px.
const COL = 480;
const ROW = 200;

type Extra = Partial<Pick<FlowNodeData, 'rules' | 'input' | 'outputs' | 'view'>>;

const node = (
	p: string,
	id: string,
	kind: ActionKind,
	title: string,
	description: string,
	col: number,
	row: number,
	extra: Extra = {}
): FlowNodeData => ({ id: `${p}-${id}`, kind, x: col * COL, y: row * ROW, title, description, ...extra });

const wire = (
	p: string,
	source: string,
	target: string,
	port: PortId = 'out',
	style: { accent?: string; dash?: Dash } = {}
): FlowEdge => ({
	id: `${p}-${source}-${target}${port === 'out' ? '' : `-${port}`}`,
	source: `${p}-${source}`,
	port,
	target: `${p}-${target}`,
	...style
});

const view = (v: NodeView): Extra => ({ view: v });
const sides = (yes: 'left' | 'right' | 'bottom' | 'top', no: 'left' | 'right' | 'bottom' | 'top'): Extra['outputs'] => [
	{ id: 'true', side: yes },
	{ id: 'false', side: no }
];

/** 1. Jev routes each prompt to a planner or a worker model. */
function jevRouter(): AutomationGraph {
	const p = 'jev';
	return {
		nodes: [
			node(p, 'prompt', 'trigger', 'Prompt submitted', 'A prompt reaches the router before any model is chosen.', 0, 0,
				view({ look: 'frame', badge: 'IF', dash: 'std', motion: 'march', speed: 1.2, corner: '◆', cornerBlink: true })),
			node(p, 'resumed', 'branch', 'Resumed session?', 'A session that already has a plan skips classification.', 0, 1,
				{ outputs: sides('left', 'right'), view: { look: 'frame', dash: 'token', pad: 'sm' } }),
			node(p, 'resume', 'agent', 'Continue with Luna', 'The worker model picks the plan up where it stopped.', -1, 2,
				{ rules: { model: 'Luna (worker)' } }),
			node(p, 'classify', 'agent', 'Jev classifies the prompt', 'Answers one typed question: how complex is this request?', 1, 2,
				{ rules: { model: 'Jev (classifier)' }, view: { badge: 'score', accent: accentOf('violet') } }),
			node(p, 'complex', 'branch', 'P(complex) ≥ 0.5?', 'Above the threshold the request needs a planner.', 1, 3,
				{ outputs: sides('left', 'right') }),
			node(p, 'plan', 'agent', 'Plan with Sol', 'The planner writes the steps before anything is edited.', 0, 4,
				{ rules: { model: 'Sol (planner)' }, view: { look: 'frame', dash: 'alt', motion: 'scan', easing: 'in-out', pauseOnHover: true } }),
			node(p, 'simple', 'agent', 'Answer with Luna', 'A simple request goes straight to the worker.', 2, 4,
				{ rules: { model: 'Luna (worker)' } }),
			node(p, 'edit', 'review', 'First edit succeeded?', 'Planning ends after the first successful write.', 0, 5,
				{ rules: { check: 'Tests pass' } }),
			node(p, 'handoff', 'agent', 'Hand off to Luna', 'Luna carries out the rest of the plan.', 0, 6,
				{ rules: { model: 'Luna (worker)' } })
		],
		edges: [
			wire(p, 'prompt', 'resumed'),
			wire(p, 'resumed', 'resume', 'true'),
			wire(p, 'resumed', 'classify', 'false'),
			wire(p, 'classify', 'complex', 'out', { dash: 'gap' }),
			wire(p, 'complex', 'plan', 'true'),
			wire(p, 'complex', 'simple', 'false'),
			wire(p, 'plan', 'edit', 'out', { accent: accentOf('violet') }),
			wire(p, 'edit', 'handoff'),
		]
	};
}

/** 2. Convert a JSON file to Markdown. */
function jsonToMarkdown(): AutomationGraph {
	const p = 'json';
	return {
		nodes: [
			node(p, 'start', 'trigger', 'File dropped', 'A .json file lands in the inbox folder.', 0, 0,
				{ input: false, outputs: [{ id: 'out', side: 'right' }], view: { look: 'frame', badge: 'config', dash: 'short' } }),
			node(p, 'read', 'read', 'Read data.json', 'Loads the file into the run.', 1, 0,
				{ input: 'left', outputs: [{ id: 'out', side: 'right' }], rules: { source: 'inbox/data.json' } }),
			node(p, 'valid', 'branch', 'Valid JSON?', 'Checks the file parses against the expected schema.', 2, 0,
				{ input: 'left', outputs: sides('top', 'bottom'), view: { badge: 'schema', pad: 'lg' } }),
			node(p, 'convert', 'transform', 'JSON → Markdown', 'Turns objects into headings, arrays into lists.', 3, -1,
				{ input: 'left', outputs: [{ id: 'out', side: 'right' }], rules: { from: 'JSON', to: 'Markdown' } }),
			node(p, 'repair', 'agent', 'Repair the JSON', 'Fixes trailing commas and unquoted keys, then tries again.', 3, 1,
				{ rules: { model: 'Luna (worker)' }, input: 'left', outputs: [{ id: 'out', side: 'right' }], view: { look: 'frame', dash: 'dot', motion: 'pulse', corner: '×' } }),
			node(p, 'write', 'write', 'Write data.md', 'Saves the Markdown beside the original.', 4, 0,
				{ input: 'left', outputs: [{ id: 'out', side: 'bottom' }], rules: { target: 'inbox/data.md' } })
		],
		edges: [
			wire(p, 'start', 'read'),
			wire(p, 'read', 'valid'),
			wire(p, 'valid', 'convert', 'true'),
			wire(p, 'valid', 'repair', 'false', { dash: 'long' }),
			wire(p, 'convert', 'write'),
			wire(p, 'repair', 'write', 'out', { dash: 'short', accent: accentOf('amber') })
		]
	};
}

/** 3. Keep an LLM wiki up to date as sources arrive. */
function llmWiki(): AutomationGraph {
	const p = 'wiki';
	return {
		nodes: [
			node(p, 'source', 'trigger', 'New source added', 'An article, paper or note is dropped into the raw folder.', 0, 0,
				view({ look: 'frame', badge: 'type', motion: 'reverse', dash: 'dot' })),
			node(p, 'read', 'read', 'Read the source', 'Loads the text and its metadata.', 0, 1, { rules: { source: 'raw/' } }),
			node(p, 'extract', 'agent', 'Extract entities and claims', 'Lists the people, concepts and facts the source states.', 0, 2,
				{ rules: { model: 'Luna (worker)' } }),
			node(p, 'exists', 'branch', 'Page already exists?', 'Looks each entity up in the wiki index.', 0, 3, { outputs: sides('left', 'right') }),
			node(p, 'merge', 'agent', 'Merge into the page', 'Adds the new claims and cites the source.', -1, 4,
				{ rules: { model: 'Luna (worker)' }, view: { look: 'frame', dash: 'gap', motion: 'march', speed: 0.6, easing: 'linear' } }),
			node(p, 'draft', 'agent', 'Draft a new page', 'Writes a first version with links to related pages.', 1, 4,
				{ rules: { model: 'Luna (worker)' }, view: { look: 'frame', dash: 'long', motion: 'draw', pad: 'none' } }),
			node(p, 'links', 'review', 'Every link resolves', 'Checks that each [[link]] points at a real page.', 0, 5,
				{ rules: { check: 'Schema valid' } }),
			node(p, 'write', 'write', 'Write the wiki page', 'Saves the page and its backlinks.', 0, 6, { rules: { target: 'wiki/' } }),
			node(p, 'index', 'send-webhook', 'Rebuild the index', 'Tells the search index a page changed.', 0, 7)
		],
		edges: [
			wire(p, 'source', 'read'),
			wire(p, 'read', 'extract'),
			wire(p, 'extract', 'exists'),
			wire(p, 'exists', 'merge', 'true'),
			wire(p, 'exists', 'draft', 'false'),
			wire(p, 'merge', 'links', 'out', { dash: 'std' }),
			wire(p, 'draft', 'links', 'out', { dash: 'alt' }),
			wire(p, 'links', 'write'),
			wire(p, 'write', 'index', 'out', { dash: 'dot', accent: accentOf('teal') })
		]
	};
}

/** 4. Review every pull request before a human looks at it. */
function pullRequestReview(): AutomationGraph {
	const p = 'pr';
	return {
		nodes: [
			node(p, 'open', 'trigger', 'Pull request opened', 'A pull request is opened or updated.', 0, 0, view({ badge: 'IF' })),
			node(p, 'diff', 'read', 'Read the diff', 'Loads the changed files and the description.', 0, 1, { rules: { source: 'pull request diff' } }),
			node(p, 'review', 'agent', 'Review the change', 'Finds bugs, missing tests and unclear names.', 0, 2,
				{ rules: { model: 'Sol (planner)' }, view: { look: 'frame', motion: 'scan', speed: 2, dash: 'std' } }),
			node(p, 'blocking', 'branch', 'Blocking issues?', 'Any finding marked blocking stops the merge.', 0, 3, { outputs: sides('left', 'right') }),
			node(p, 'changes', 'write', 'Request changes', 'Posts each finding as a comment on its line.', -1, 4,
				{ rules: { target: 'pull request comments' } }),
			node(p, 'approve', 'write', 'Approve the pull request', 'Posts an approval with the summary.', 1, 4,
				{ rules: { target: 'pull request review' } }),
			node(p, 'notify', 'send-webhook', 'Tell the channel', 'Posts the verdict to the team channel.', 0, 5,
				{ input: 'top' })
		],
		edges: [
			wire(p, 'open', 'diff'),
			wire(p, 'diff', 'review'),
			wire(p, 'review', 'blocking'),
			wire(p, 'blocking', 'changes', 'true', { accent: accentOf('red') }),
			wire(p, 'blocking', 'approve', 'false', { accent: accentOf('green') }),
			wire(p, 'changes', 'notify', 'out', { dash: 'gap' }),
			wire(p, 'approve', 'notify', 'out', { dash: 'gap' })
		]
	};
}

/** 5. Sort support requests and draft the replies. */
function supportTriage(): AutomationGraph {
	const p = 'support';
	return {
		nodes: [
			node(p, 'email', 'trigger', 'Request received', 'A customer writes to the support address.', 0, 0, view({ look: 'frame', corner: '+', dash: 'token' })),
			node(p, 'classify', 'agent', 'Jev rates the urgency', 'Answers one typed question: urgent, normal or low?', 0, 1,
				{ rules: { model: 'Jev (classifier)' }, view: { badge: 'choice', accent: accentOf('violet') } }),
			node(p, 'urgent', 'branch', 'Urgent?', 'Outages and billing errors count as urgent.', 0, 2, { outputs: sides('left', 'right') }),
			node(p, 'page', 'send-webhook', 'Page the on-call', 'Sends the request to the on-call engineer.', -1, 3),
			node(p, 'draft', 'agent', 'Draft a reply', 'Writes an answer from the help centre articles.', 1, 3,
				{ rules: { model: 'Luna (worker)' } }),
			node(p, 'approve', 'review', 'A person approves', 'Holds the draft until a teammate approves it.', 1, 4,
				{ rules: { check: 'Human approves' }, view: { look: 'frame', dash: 'alt', motion: 'pulse', cornerBlink: false } }),
			node(p, 'send', 'send-email', 'Send the reply', 'Sends the approved answer to the customer.', 1, 5, { rules: { subject: 'Re: your request' } }),
			node(p, 'tag', 'update-record', 'Tag the ticket', 'Records the urgency and the outcome on the ticket.', 0, 6,
				{ rules: { action: 'Add tag', value: 'triaged' } })
		],
		edges: [
			wire(p, 'email', 'classify'),
			wire(p, 'classify', 'urgent'),
			wire(p, 'urgent', 'page', 'true', { accent: accentOf('red'), dash: 'short' }),
			wire(p, 'urgent', 'draft', 'false'),
			wire(p, 'draft', 'approve'),
			wire(p, 'approve', 'send'),
			wire(p, 'page', 'tag', 'out', { dash: 'dot' }),
			wire(p, 'send', 'tag', 'out', { dash: 'dot' })
		]
	};
}

/** 6. Turn a meeting recording into notes and tasks. */
function meetingNotes(): AutomationGraph {
	const p = 'meeting';
	return {
		nodes: [
			node(p, 'upload', 'trigger', 'Recording uploaded', 'A meeting recording finishes uploading.', 0, 0,
				{ input: false, outputs: [{ id: 'out', side: 'right' }] }),
			node(p, 'text', 'transform', 'Audio → transcript', 'Converts speech to text with speaker labels.', 1, 0,
				{ input: 'left', outputs: [{ id: 'out', side: 'right' }], rules: { from: 'Text', to: 'Text' }, view: { badge: 'type' } }),
			node(p, 'summary', 'agent', 'Summarise the meeting', 'Keeps decisions, drops the small talk.', 2, 0,
				{ rules: { model: 'Luna (worker)' }, input: 'left', outputs: [{ id: 'out', side: 'right' }, ], view: { look: 'frame', dash: 'std', motion: 'march', corner: '□' } }),
			node(p, 'tasks', 'agent', 'List the action items', 'Finds each task, its owner and its due date.', 2, 1,
				{ rules: { model: 'Luna (worker)' }, input: 'top', outputs: [{ id: 'out', side: 'left' }], view: { look: 'frame', dash: 'short', motion: 'reverse', corner: '*', pad: 'lg' } }),
			node(p, 'notes', 'write', 'Write the notes page', 'Saves the summary with the transcript attached.', 1, 1,
				{ input: 'right', outputs: [{ id: 'out', side: 'bottom' }], rules: { target: 'notes/' } }),
			node(p, 'share', 'send-email', 'Share with attendees', 'Emails the summary and the action items.', 1, 2,
				{ rules: { subject: 'Notes from the meeting' } })
		],
		edges: [
			wire(p, 'upload', 'text'),
			wire(p, 'text', 'summary'),
			wire(p, 'summary', 'tasks', 'out', { accent: accentOf('violet') }),
			wire(p, 'tasks', 'notes'),
			wire(p, 'notes', 'share', 'out', { dash: 'long' })
		]
	};
}

/** 7. A weekly report that waits for Monday. */
function weeklyReport(): AutomationGraph {
	const p = 'report';
	return {
		nodes: [
			node(p, 'week', 'trigger', 'Every week', 'Starts once a week.', 0, 0, view({ badge: 'config' })),
			node(p, 'monday', 'wait-until', 'Monday at 9:00 AM', 'Holds the run until the start of the work week.', 0, 1),
			node(p, 'read', 'read', 'Read analytics.csv', 'Loads last week’s numbers.', 0, 2, { rules: { source: 'analytics.csv' } }),
			node(p, 'json', 'transform', 'CSV → JSON', 'Turns each row into a record.', 0, 3, { rules: { from: 'CSV', to: 'JSON' }, view: { pad: 'sm' } }),
			node(p, 'summary', 'agent', 'Write the summary', 'Explains what moved and why, in three sentences.', 0, 4,
				{ rules: { model: 'Luna (worker)' }, view: { look: 'frame', motion: 'draw', dash: 'std', easing: 'out-back' } }),
			node(p, 'send', 'send-email', 'Email the report', 'Sends the summary to the team.', 0, 5, { rules: { subject: 'Weekly report' } }),
			node(p, 'again', 'time-delay', 'Wait 7 days', 'Pauses until next week.', 0, 6),
			node(p, 'next', 'run-workflow', 'Weekly report', 'Hands the run over to start the flow again.', 0, 7,
				{ rules: { automation: 'Weekly report' } })
		],
		edges: [
			wire(p, 'week', 'monday'), wire(p, 'monday', 'read'), wire(p, 'read', 'json'), wire(p, 'json', 'summary'),
			wire(p, 'summary', 'send'), wire(p, 'send', 'again', 'out', { dash: 'alt' }), wire(p, 'again', 'next', 'out', { dash: 'alt' })
		]
	};
}

/** 8. Draft the changelog when a version is tagged. */
function releaseNotes(): AutomationGraph {
	const p = 'release';
	return {
		nodes: [
			node(p, 'tag', 'trigger', 'Version tagged', 'A release tag is pushed to the repository.', 0, 0, view({ look: 'frame', badge: 'IF', corner: '·', dash: 'dot' })),
			node(p, 'commits', 'read', 'Read the commits', 'Lists every commit since the last tag.', 0, 1, { rules: { source: 'git log' } }),
			node(p, 'group', 'agent', 'Group by theme', 'Sorts changes into features, fixes and breaking changes.', 0, 2, { rules: { model: 'Luna (worker)' } }),
			node(p, 'breaking', 'branch', 'Any breaking change?', 'A breaking change needs a migration note.', 0, 3, { outputs: sides('left', 'right') }),
			node(p, 'migrate', 'agent', 'Write the migration note', 'Explains what to change and shows the before and after.', -1, 4,
				{ rules: { model: 'Luna (worker)' }, view: { look: 'frame', dash: 'gap' } }),
			node(p, 'ok', 'transform', 'Format as Markdown', 'Turns the groups into a CHANGELOG entry.', 1, 4, { rules: { from: 'JSON', to: 'Markdown' } }),
			node(p, 'approve', 'review', 'A person approves', 'The release manager reads the entry before it ships.', 0, 5, { rules: { check: 'Human approves' } }),
			node(p, 'write', 'write', 'Update CHANGELOG.md', 'Adds the entry at the top.', 0, 6, { rules: { target: 'CHANGELOG.md' } })
		],
		edges: [
			wire(p, 'tag', 'commits'), wire(p, 'commits', 'group'), wire(p, 'group', 'breaking'),
			wire(p, 'breaking', 'migrate', 'true', { accent: accentOf('amber') }), wire(p, 'breaking', 'ok', 'false'),
			wire(p, 'migrate', 'approve'), wire(p, 'ok', 'approve'), wire(p, 'approve', 'write')
		]
	};
}

/** 9. Translate a post into two languages at once. */
function translatePost(): AutomationGraph {
	const p = 'translate';
	return {
		nodes: [
			node(p, 'post', 'trigger', 'Post published', 'A post goes live in English.', 1, 0,
				{ outputs: [{ id: 'out', side: 'left' }, ], view: { look: 'frame', dash: 'std', motion: 'march' } }),
			node(p, 'es', 'agent', 'Translate to Spanish', 'Keeps the tone and the code samples.', 0, 1,
				{ rules: { model: 'Luna (worker)' }, input: 'right', outputs: [{ id: 'out', side: 'bottom' }], view: { badge: 'ES' } }),
			node(p, 'fr', 'agent', 'Translate to French', 'Keeps the tone and the code samples.', 2, 1,
				{ rules: { model: 'Luna (worker)' }, input: 'left', outputs: [{ id: 'out', side: 'bottom' }], view: { badge: 'FR' } }),
			node(p, 'score', 'review', 'Quality score above 0.8', 'Compares each version back against the English.', 1, 2,
				{ rules: { check: 'Score above threshold' } }),
			node(p, 'write', 'write', 'Publish both versions', 'Adds each language beside the original.', 1, 3, { rules: { target: 'posts/es, posts/fr' } })
		],
		edges: [
			wire(p, 'post', 'es', 'out', { dash: 'long' }),
			{ ...wire(p, 'post', 'fr'), dash: 'long' },
			wire(p, 'es', 'score'), wire(p, 'fr', 'score'), wire(p, 'score', 'write')
		]
	};
}

/** 10. Handle an alert, check again, and escalate if it does not clear. */
function incidentResponse(): AutomationGraph {
	const p = 'incident';
	return {
		nodes: [
			node(p, 'alert', 'trigger', 'Alert fired', 'Monitoring reports that the service is unhealthy.', 0, 0,
				view({ look: 'frame', badge: 'IF', dash: 'short', motion: 'pulse', speed: 2, cornerBlink: true })),
			node(p, 'diagnose', 'agent', 'Diagnose the cause', 'Reads recent deploys and logs and names the likely cause.', 0, 1,
				{ rules: { model: 'Sol (planner)' } }),
			node(p, 'fix', 'send-webhook', 'Roll back the deploy', 'Asks the deploy system to restore the last good version.', 0, 2),
			node(p, 'wait', 'time-delay', 'Wait 5 minutes', 'Gives the service time to recover.', 0, 3, { rules: { amount: '5', unit: 'minutes' } }),
			node(p, 'status', 'read', 'Read the health check', 'Loads the current status of the service.', 0, 4, { rules: { source: 'status endpoint' } }),
			node(p, 'ok', 'branch', 'Recovered?', 'The service answers its health check.', 0, 5, { outputs: sides('left', 'right') }),
			node(p, 'post', 'write', 'Draft the post-mortem', 'Writes the timeline and the cause.', -1, 6),
			node(p, 'escalate', 'run-workflow', 'Escalation', 'Hands the incident to the escalation flow.', 1, 6,
				{ rules: { automation: 'Escalation' }, view: { look: 'frame', dash: 'alt', motion: 'scan', corner: '×' } })
		],
		edges: [
			wire(p, 'alert', 'diagnose', 'out', { accent: accentOf('red') }), wire(p, 'diagnose', 'fix'), wire(p, 'fix', 'wait', 'out', { dash: 'std' }),
			wire(p, 'wait', 'status'), wire(p, 'status', 'ok'), wire(p, 'ok', 'post', 'true', { accent: accentOf('green') }),
			wire(p, 'ok', 'escalate', 'false', { accent: accentOf('red'), dash: 'dot' })
		]
	};
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

type Row = [id: string, name: string, description: string, status: AutomationStatus, category: AutomationCategory, started: number, finished: number];

const ROWS: Row[] = [
	['jev', 'Jev Router', 'Classifies each prompt and sends it to a planner or a worker', 'running', 'agents', 214, 198],
	['json', 'JSON to Markdown', 'Converts a dropped .json file into a readable .md', 'running', 'data', 58, 55],
	['wiki', 'LLM Wiki', 'Keeps a wiki current as new sources arrive', 'running', 'knowledge', 131, 117],
	['pr', 'Pull Request Review', 'Reviews every pull request before a person looks at it', 'running', 'agents', 87, 80],
	['support', 'Support Triage', 'Rates urgency, pages on-call and drafts replies', 'paused', 'agents', 342, 301],
	['meeting', 'Meeting Notes', 'Turns a recording into notes and action items', 'draft', 'knowledge', 0, 0],
	['report', 'Weekly Report', 'Reads last week’s numbers and writes the summary', 'running', 'data', 26, 26],
	['release', 'Release Notes', 'Drafts the changelog when a version is tagged', 'draft', 'data', 0, 0],
	['translate', 'Translate a Post', 'Publishes a post in two more languages at once', 'paused', 'knowledge', 19, 12],
	['incident', 'Incident Response', 'Rolls back, checks again and escalates if it does not clear', 'draft', 'agents', 0, 0]
];

export function seedAutomations(now: number): Automation[] {
	return ROWS.map(([id, name, description, status, category, started, finished], index) => ({
		id,
		name,
		description,
		status,
		category,
		started,
		finished,
		createdAt: now - index * DAY,
		updatedAt: now - (index + 1) * 17 * MINUTE
	}));
}

// ── what each sample step answers with, and the conditions its branches test ───────
// Every step that would touch the outside world declares `sampleOutput`, the JSON a simulation answers with.
// A branch's condition then runs for real over that data, so a simulation takes the path the data points to.
// Change a sample output (in the step panel) and the run takes another path.

const out = (value: unknown) => JSON.stringify(value);
const when = (path: string, operator: string, value?: string, combine: 'all' | 'any' = 'all') => out({ combine, items: [{ path, operator, ...(value === undefined ? {} : { value }) }] });

type RuleTable = Record<string, Record<string, string>>;

const SAMPLE_RULES: Record<string, RuleTable> = {
	jev: {
		'jev-prompt': { sampleOutput: out({ prompt: 'Refactor the billing module and add tests', session: null }) },
		'jev-resumed': { conditions: when('trigger.session', 'exists') },
		'jev-resume': { sampleOutput: out({ text: 'Continuing the saved plan' }) },
		'jev-classify': { sampleOutput: out({ label: 'complex', score: 0.82 }) },
		'jev-complex': { conditions: when('jev-classify.score', '>=', '0.5') },
		'jev-plan': { sampleOutput: out({ steps: ['split the module', 'add tests', 'move the callers'] }) },
		'jev-simple': { sampleOutput: out({ text: 'Answered directly' }) },
		'jev-edit': { sampleOutput: out({ pass: true }) },
		'jev-handoff': { sampleOutput: out({ text: 'Carried out the plan' }) }
	},
	json: {
		'json-start': { sampleOutput: out({ file: 'inbox/data.json' }) },
		'json-read': { sampleOutput: out({ title: 'Weekly metrics', visits: 1200, sources: { search: 700, direct: 500 }, tags: ['growth', 'weekly'] }) },
		'json-valid': { conditions: when('json-read.title', 'exists') },
		'json-repair': { sampleOutput: out('# Weekly metrics (repaired)\n\n- **visits:** 1200\n') }
	},
	wiki: {
		'wiki-source': { sampleOutput: out({ source: 'raw/attention-is-all-you-need.md' }) },
		'wiki-read': { sampleOutput: out({ path: 'raw/attention-is-all-you-need.md', content: 'The Transformer relies on attention alone…' }) },
		'wiki-extract': { sampleOutput: out({ entities: ['Transformer', 'Attention'], claims: 3, pageExists: true }) },
		'wiki-exists': { conditions: when('wiki-extract.pageExists', 'is', 'true') },
		'wiki-merge': { sampleOutput: out({ page: 'Transformer', changed: true }) },
		'wiki-draft': { sampleOutput: out({ page: 'Transformer', created: true }) },
		'wiki-links': { schema: out({ type: 'object', required: ['page'] }) }
	},
	pr: {
		'pr-open': { sampleOutput: out({ pr: 482, title: 'Add retry to the queue' }) },
		'pr-diff': { sampleOutput: out({ files: 4, additions: 120, deletions: 30 }) },
		'pr-review': { sampleOutput: out({ blocking: 0, findings: ['rename `x` to `attempts`'] }) },
		'pr-blocking': { conditions: when('pr-review.blocking', '>', '0') }
	},
	support: {
		'support-email': { sampleOutput: out({ from: 'sam@example.com', subject: 'Checkout is slow', body: 'It takes ten seconds to pay.' }) },
		'support-classify': { sampleOutput: out({ urgency: 'normal' }) },
		'support-urgent': { conditions: when('support-classify.urgency', 'is', 'urgent') },
		'support-draft': { sampleOutput: out({ reply: 'Thanks for the report. We are looking into the slow checkout.' }) }
	},
	meeting: {
		'meeting-upload': { sampleOutput: out({ file: 'standup.m4a' }) },
		'meeting-summary': { sampleOutput: out({ summary: 'Shipped the export; blocked on review.', decisions: 2 }) },
		'meeting-tasks': { sampleOutput: out({ tasks: [{ owner: 'Ava', task: 'Review the export PR', due: 'Fri' }] }) }
	},
	report: {
		'report-week': { sampleOutput: out({ week: '2026-W41' }) },
		'report-read': { sampleOutput: out('week,visits,signups\n2026-W40,1200,48\n2026-W41,1344,61\n') },
		'report-monday': { day: 'Monday', time: '09:00' },
		'report-summary': { sampleOutput: out({ summary: 'Visits rose 12% and signups 27%.' }) },
		'report-again': { amount: '7', unit: 'days' }
	},
	release: {
		'release-tag': { sampleOutput: out({ tag: 'v1.4.0' }) },
		'release-commits': { sampleOutput: out({ commits: ['feat: export workflows', 'fix: log order'] }) },
		'release-group': { sampleOutput: out({ features: ['export workflows'], fixes: ['log order'], breaking: false }) },
		'release-breaking': { conditions: when('release-group.breaking', 'is', 'true') },
		'release-migrate': { sampleOutput: out({ note: 'Rename `enroll` to `run-workflow`.' }) }
	},
	translate: {
		'translate-post': { sampleOutput: out({ post: 'posts/hello.md', title: 'Hello' }) },
		'translate-es': { sampleOutput: out({ text: 'Hola', score: 0.91 }) },
		'translate-fr': { sampleOutput: out({ text: 'Bonjour', score: 0.86 }) },
		'translate-score': { path: 'translate-es.score', threshold: '0.8' }
	},
	incident: {
		'incident-alert': { sampleOutput: out({ service: 'checkout', severity: 'high' }) },
		'incident-diagnose': { sampleOutput: out({ cause: 'deploy 482 raised the error rate' }) },
		'incident-status': { sampleOutput: out({ healthy: true }) },
		'incident-ok': { conditions: when('incident-status.healthy', 'is', 'true') }
	}
};

/** A sample with its sample outputs and conditions filled in. */
function sample(id: string, build: () => AutomationGraph): () => AutomationGraph {
	return () => {
		const graph = build();
		const table = SAMPLE_RULES[id] ?? {};

		for (const node of graph.nodes) if (table[node.id]) node.rules = { ...(node.rules ?? {}), ...table[node.id] };

		return graph;
	};
}

export const SEED_GRAPHS: Record<string, () => AutomationGraph> = {
	jev: sample('jev', jevRouter),
	json: sample('json', jsonToMarkdown),
	wiki: sample('wiki', llmWiki),
	pr: sample('pr', pullRequestReview),
	support: sample('support', supportTriage),
	meeting: sample('meeting', meetingNotes),
	report: sample('report', weeklyReport),
	release: sample('release', releaseNotes),
	translate: sample('translate', translatePost),
	incident: sample('incident', incidentResponse)
};

export function blankGraph(id: string): AutomationGraph {
	return {
		nodes: [
			{
				id: `${id}-trigger`,
				kind: 'trigger',
				x: 0,
				y: 0,
				title: 'Run started',
				description: 'Starts the flow when its event arrives.'
			}
		],
		edges: []
	};
}
