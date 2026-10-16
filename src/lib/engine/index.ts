// The headless part of the package: the workflow file format, checks on a graph, and the MCP config.
// No Svelte, no DOM. Import from '@fractaldesign/machines-ui/engine'.
export { FORMAT, FlowParseError, exportFlow, importFlow, type ExportOptions } from './format.js';
export { exportMarkdown } from './markdown.js';
export { mcpConfig, mcpConfigText, slug, type McpConfig } from './mcp.js';
export { portsOf, validateGraph } from './validate.js';
export type { FlowDocument, FlowGraph, FlowMeta, Problem, TestRunLog } from './types.js';

// ── running a workflow ─────────────────────────────────────────────────────────────
export { createRunner, behaviourHash, DEFAULT_LIMITS, type Runner } from './runner.js';
export { realClock, fastClock } from './clock.js';
export { memoryRunStore, indexedDbRunStore } from './store.js';
export { OPERATORS, check, describe, evaluate, lookup, parseConditions, type Condition, type ConditionSet, type Operator } from './conditions.js';
export { FORMATS, CONVERSIONS, convert, type Format } from './transform.js';
export { checkSchema } from './schema.js';
export { redact, clip, resolveRefs, secretsFrom } from './redact.js';
export { FlowRunError } from './run-types.js';
export type { Adapters, Clock, Executor, Level, LogEntry, RunEvent, RunHandle, RunLimits, RunOptions, RunRecord, RunState, RunStatus, RunStore, RunnerOptions, StepContext, StepResult, StepRun, StepStatus } from './run-types.js';
