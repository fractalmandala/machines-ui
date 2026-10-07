import './flow-actions.css';
import '$lib/styles/palette.css';
import { accentOf } from '$lib/core/values.js';
import type { AssetSvgComponent } from '$lib/components/ui/asset/asset-types.js';
import type { ActionKind } from '$lib/stores/flow-store.svelte';
import BoltIcon from '$lib/icons/flow/bolt.svelte';
import MailIcon from '$lib/icons/flow/mail.svelte';
import RotateIcon from '$lib/icons/flow/rotate.svelte';
import WebhookIcon from '$lib/icons/flow/webhook.svelte';
import ProgressIcon from '$lib/icons/flow/progress.svelte';
import HistoryIcon from '$lib/icons/flow/history.svelte';
import GitBranchIcon from '$lib/icons/flow/git-branch.svelte';
import UsersPlusIcon from '$lib/icons/flow/users-plus.svelte';
import SparkleIcon from '$lib/icons/flow/sparkle.svelte';
import TransformIcon from '$lib/icons/flow/transform.svelte';
import ReadIcon from '$lib/icons/flow/read.svelte';
import WriteIcon from '$lib/icons/flow/write.svelte';
import ReviewIcon from '$lib/icons/flow/review.svelte';

export type ActionDefinition = {
	kind: ActionKind;
	label: string;
	accent: string;
	theme: string;
	Icon: AssetSvgComponent;
	title: string;
	description: string;
};

export const ACTIONS: Record<ActionKind, ActionDefinition> = {
	trigger: {
		kind: 'trigger',
		label: 'Trigger Action',
		accent: accentOf('trigger'),
		theme: 'fl-action-theme-trigger',
		Icon: BoltIcon,
		title: 'Event received',
		description: 'Starts the flow when its event arrives.'
	},
	'send-email': {
		kind: 'send-email',
		label: 'Send Email',
		accent: accentOf('send-email'),
		theme: 'fl-action-theme-send-email',
		Icon: MailIcon,
		title: 'Send a summary',
		description: 'Emails the result to the people who need it.'
	},
	'update-subscription': {
		kind: 'update-subscription',
		label: 'Update Record',
		accent: accentOf('update-subscription'),
		theme: 'fl-action-theme-update-subscription',
		Icon: RotateIcon,
		title: 'Tag the record',
		description: 'Adds a tag or changes a field on the record.'
	},
	'send-webhook': {
		kind: 'send-webhook',
		label: 'Send Webhook',
		accent: accentOf('send-webhook'),
		theme: 'fl-action-theme-send-webhook',
		Icon: WebhookIcon,
		title: 'Notify another system',
		description: 'Sends the result to an external URL.'
	},
	'wait-until': {
		kind: 'wait-until',
		label: 'Wait Until',
		accent: accentOf('wait-until'),
		theme: 'fl-action-theme-wait-until',
		Icon: ProgressIcon,
		title: 'Monday at 9:00 AM',
		description: 'Holds the run until a set time.'
	},
	'time-delay': {
		kind: 'time-delay',
		label: 'Time Delay',
		accent: accentOf('time-delay'),
		theme: 'fl-action-theme-time-delay',
		Icon: HistoryIcon,
		title: 'Wait 2 days',
		description: 'Pauses the run before the next step.'
	},
	branch: {
		kind: 'branch',
		label: 'True/False Branch',
		accent: accentOf('branch'),
		theme: 'fl-action-theme-branch',
		Icon: GitBranchIcon,
		title: 'Branch on 0 conditions',
		description: 'Add a condition to choose between two paths.'
	},
	agent: {
		kind: 'agent',
		label: 'Run Agent',
		accent: accentOf('violet'),
		theme: 'fl-action-theme-agent',
		Icon: SparkleIcon,
		title: 'Classify the request',
		description: 'Asks a model to decide, write or plan.'
	},
	transform: {
		kind: 'transform',
		label: 'Transform',
		accent: accentOf('cyan'),
		theme: 'fl-action-theme-transform',
		Icon: TransformIcon,
		title: 'Convert the format',
		description: 'Reshapes data from one form into another.'
	},
	read: {
		kind: 'read',
		label: 'Read Source',
		accent: accentOf('teal'),
		theme: 'fl-action-theme-read',
		Icon: ReadIcon,
		title: 'Read the source',
		description: 'Loads a file, page or record into the run.'
	},
	write: {
		kind: 'write',
		label: 'Write Output',
		accent: accentOf('green'),
		theme: 'fl-action-theme-write',
		Icon: WriteIcon,
		title: 'Write the result',
		description: 'Saves the result to a file, page or store.'
	},
	review: {
		kind: 'review',
		label: 'Review',
		accent: accentOf('amber'),
		theme: 'fl-action-theme-review',
		Icon: ReviewIcon,
		title: 'Check the result',
		description: 'Holds the run until the result passes a check.'
	},
	enroll: {
		kind: 'enroll',
		label: 'Run Flow',
		accent: accentOf('enroll'),
		theme: 'fl-action-theme-enroll',
		Icon: UsersPlusIcon,
		title: 'Another flow',
		description: 'Hands the run over to another flow.'
	}
};

export const ACTION_GROUPS: { label: string; kinds: ActionKind[] }[] = [
	{ label: 'Agents', kinds: ['agent', 'review'] },
	{ label: 'Data', kinds: ['read', 'transform', 'write'] },
	{ label: 'Messages', kinds: ['send-email', 'send-webhook'] },
	{ label: 'Records', kinds: ['update-subscription'] },
	{ label: 'Delays', kinds: ['wait-until', 'time-delay'] },
	{ label: 'Flow control', kinds: ['branch', 'enroll'] }
];
