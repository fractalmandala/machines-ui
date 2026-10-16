# Spec: set, export, run, log and connect workflows

Status: built (0.1.0). Every phase below is delivered and checked; the only step left is `npm publish`, which needs the owner's login.

| Phase | Checked by |
|---|---|
| P1 Format | `scripts/engine-check.ts` (198 checks), part of `prepack` |
| P2 Engine | `scripts/engine-run-check.ts` (144 checks), part of `prepack`; run API exported from the root, engine at `/engine` and `/engine/node` |
| P3 UI | `scripts/e2e-creator.ts` (51 checks in a real browser on `/creator`: all ten samples, approval, payload, Status and Logs tabs, history) |
| P4 Connect | `engine-check` snapshots, and the e2e's Connect dialog checks |
| P5 Adapters | `engine-run-check` (allowlist, adapters, redaction, timeouts, retries) |
| P6 Docs and release | `/docs/engine`, README, `test-machine` (64 workflow tests, including all ten samples through the public API) |

## 1. Brief

A user of `@fractaldesign/machines-ui` can:

1. **Set** a workflow: build it on the canvas, edit steps and their rules, and save it as a portable file.
2. **Export** it as JSON or as Markdown, with or without the latest test run log, and import the JSON back without losing anything.
3. **Run** it. By default a run is a **simulation**: every step that would touch the outside world (a model, email, a URL, files) is answered by a stand-in, and the run follows the workflow's real logic over the stand-in data. A developer who builds a real workflow supplies their own adapters, and the same run then does the real thing.
4. **Get logs**: a structured record of every run, kept, and filterable in the Logs tab.
5. **Connect to MCP**: the Connect dialog gives the user one thing, the MCP server config JSON for this workflow, with a plain note that they host the server themselves. Nothing else.

**The sample workflows are demonstrations.** They exist to show the concepts of building workflows, for people to copy into their own places. Nothing in this library calls a real model, sends real email, or requests a real URL on its own, and none of the samples has to run for real. They run as simulations.

## 2. What exists today, and what is wrong with it

Read from `src/lib` and the vendored `workflow-editor-main` (which is the same code in React; it contributes only UI, not engine).

| Area | Today | Problem |
|---|---|---|
| Run | `flow-run.ts` walks the graph on timers. | A simulation. The branch is `Math.random() < 0.6`. Log text is canned. Steps do nothing. No data passes between steps. The run state lives in one global store, so it cannot run two flows. **The package exports no run function**, so a consumer cannot run a workflow at all (found by the test site). |
| Logs | `RunLog { level: info/success/warning, message }`, 200-entry cap, in the global store. | No error level, no per-step input or output, no run history, no persistence, no export except the last 12 lines in Markdown. |
| Export | `export-formats.ts`: JSON, CSV, Markdown from the graph. | The JSON is lossy: it drops ports, side, look (`view`), edge colour and dash. The UI says "Re-import it" but **there is no import**. The curl snippet in the Export screen calls a made-up API. |
| MCP | `mcp-connect.svelte` shows a config, a prompt, four tool names and a status. | A mock. The package `@machines/mcp` it names does not exist, and "Not connected / 3 steps exposed" is static text. |

## 3. Goals

Goals: one engine that runs in the browser and in Node; a file format that round-trips everything; runs that are reproducible in tests; safe by default.

## 4. Architecture

```
            ┌─────────────────────────────────────────────┐
            │  machines-ui   (Svelte: canvas, panels)      │
            │    run controls · logs panel · export dialog │
            └───────────────┬─────────────────────────────┘
                            │ events / commands
            ┌───────────────▼─────────────────────────────┐
            │  machines-ui/engine   (headless, no DOM)     │
            │    schema · validate · import/export         │
            │    runner · executors · run store            │
            └─────────────────────────────────────────────┘
```

Decisions:

- **D1. The engine is a subpath of the existing package**, `@fractaldesign/machines-ui/engine`, with no Svelte and no DOM imports. It can be split into its own package later without an API change. Reason: one version, one test run, and the UI needs it now.
- **D2. MCP is only a config JSON.** The Connect dialog shows it with a note that the user hosts the server; the editor generates no server code and publishes no MCP package (see 9).
- **D3. The store stops owning the run.** The engine produces events; the Svelte store is an adapter that reduces those events into `flow.run` and `flow.logs` for the UI. Two canvases can then run independently.

## 5. The file format: `machines.flow/1`

One versioned JSON document.

```jsonc
{
  "format": "machines.flow/1",
  "id": "jev",
  "name": "Jev Router",
  "description": "…",
  "meta": { "category": "agents", "createdAt": "…", "updatedAt": "…" },
  "nodes": [
    {
      "id": "jev-classify",
      "kind": "agent",
      "title": "Jev classifies the prompt",
      "description": "…",
      "position": { "x": 480, "y": 400 },
      "input": "top",                       // side or false
      "outputs": [{ "id": "out", "side": "bottom" }],
      "rules": { "model": "Jev (classifier)", "prompt": "…" },
      "view": { "look": "frame", "dash": "std", "accent": "…" }   // optional, presentation only
    }
  ],
  "edges": [
    { "id": "…", "source": "jev-classify", "port": "out", "target": "…", "accent": "…", "dash": "gap" }
  ]
}
```

Rules:

- **Lossless.** `importFlow(exportFlow(g))` equals `g` for every field the editor can set. Tested on all ten samples.
- **Presentation is separate.** `view`, edge `accent` and `dash`, and `position` never change how a run behaves.
- **No secrets.** A rule value may reference `${env.NAME}` or `${secret.NAME}`; the value is never written to the file or a log.
- **Versioned.** An unknown major version is rejected with a clear message; an older minor is migrated.
- The **Markdown brief** is the one other format: a readable outline of the workflow, export-only.

API (all in `/engine`):

```ts
exportFlow(graph, options?): FlowDocument
importFlow(input: string | object): { graph, warnings } | throws FlowParseError  // carries path + message per problem
validateGraph(graph): Problem[]        // see 5.1
```

### 5.1 Validation

Run before every import, export and run. Each problem has `severity` (error blocks a run; warning does not), a `nodeId` or `edgeId`, a `code` and a plain message.

Errors: duplicate ids; edge to a missing node; edge from a port the source does not have; a node with an input but nothing leading in (unless it is a trigger); no trigger; a cycle with no exit (see 6.4).
Warnings: a branch with an unconnected port; a step with no rules where its kind requires some; two edges from the same port to the same target.

## 6. The engine

### 6.1 Execution model

- A run starts at every `trigger` step (or the one named in the call).
- Each step is a **token** moving along edges. A step runs once all of its *activated* incoming edges have delivered (join on activated: an edge not taken by an upstream branch does not block the join).
- A step returns `{ output, port?, logs? }`. A `branch` returns `port: 'true' | 'false'`; every other step returns `port: 'out'`. Only the edges on the chosen port are activated.
- Fan-out runs the targets **concurrently** up to `maxParallel` (default 4); `maxParallel: 1` gives a deterministic order for tests.
- The run ends when no token is left, or on stop, or on failure policy.

### 6.2 Data

Every step receives a `StepContext`:

```ts
{
  run: { id, startedAt },
  step: FlowNodeData,
  input: unknown,            // the upstream output; an object keyed by source node id when several arrive
  data: Record<string, unknown>,   // outputs of every step that has run, by node id: data['jev-classify'].score
  trigger: unknown,          // the payload the run was started with
  env: Record<string, string>,     // resolved ${env.*}, never logged
  signal: AbortSignal,
  clock: Clock,              // injected: fast-forwarding in a simulation, real when the host wants real waits
  log: (level, message, data?) => void
}
```

### 6.3 Branch conditions

Today the Build panel stores `rules.conditions` as `{ field, operator, value }[]` over fixed demo fields. Replace with a small, safe, no-`eval` condition language over `data`:

```
path operator value        e.g.  jev-classify.score >= 0.5      jev-classify.label is "complex"
operators: is, is not, >, >=, <, <=, contains, matches (regex), exists
combine:   all of [...]  /  any of [...]
```

The panel offers the step's upstream outputs as the field list. An unknown path evaluates to false and logs a warning.

### 6.4 Limits and safety

- `maxSteps` (default 200) and `maxVisitsPerStep` (default 10). A cycle is allowed only if it can leave (a branch inside it) and is stopped by those limits, logged as a warning.
- Per-step `timeoutMs` (default 30 000), per-run `deadlineMs`.
- **Failure policy per step** (`rules.onError`): `stop` (default), `continue` (the step's output is `{ error }`), or `retry` with `attempts` and a backoff. A retried step logs each attempt.
- Cancellation through `AbortSignal`; `stopRun()` aborts all in-flight steps.

### 6.5 Stand-ins and real adapters

There is no mode switch. For each step kind that touches the outside world, the runner asks: did the host supply an adapter for it?

- **No adapter (the default):** a **stand-in** answers. It does nothing outside the run, logs what it *would* have done ("would POST to https://… with …"), and returns the step's **sample output**.
- **An adapter:** the host's code runs, and its answer is the output.

**Sample output.** Each step can declare `rules.sampleOutput`, the JSON the stand-in returns. This is what makes a simulation meaningful: the Jev step declares `{ "score": 0.82, "label": "complex" }`, and the next branch, `jev-classify.score >= 0.5`, is then evaluated for real on that data and takes the Sol path. Change the sample score to 0.2 and the run takes the Luna path. No randomness. Kinds without a declared sample output return a plausible default for their kind.

Delays are fast-forwarded by the injected clock in a simulation and logged ("would wait until Monday 9:00"). A host can give the runner a real clock.

Every `StepRun` records `stubbed: true | false`, so a log always shows which steps were stand-ins. The UI labels a run **Simulated** when any step was.

### 6.6 Executors

```ts
type Executor = (ctx: StepContext) => Promise<StepResult>
createRunner({ executors, adapters, store, clock })
```

Built in, with no outside dependency:

| Kind | Behaviour |
|---|---|
| `trigger` | Emits the run's payload. |
| `branch` | Evaluates 6.3, returns the port. |
| `transform` | Deterministic converters selected by `rules.from` → `rules.to`: JSON⇄Markdown, CSV⇄JSON, text. Pure functions, unit-tested. |
| `wait-until`, `time-delay` | Sleep on the injected clock. |
| `review` | `Schema valid` (JSON Schema from `rules`), `Score above threshold` (compare an upstream number), `Tests pass` (adapter), **`Human approves`** (see 6.7). |

Through adapters the host supplies (the library ships the interfaces and the stand-ins, and never any provider code: no model SDK, no mail service, no HTTP client wiring):

| Kind | Adapter |
|---|---|
| `agent` | `agents[model](prompt, ctx) → string \| object` |
| `read`, `write` | `storage.read(path)`, `storage.write(path, data)`. Browser default: an in-memory store. Node (the generated server): a folder the host configures, and nothing outside it. |
| `send-email` | `mail.send(message)` |
| `send-webhook` | `http.fetch(request)`; the default allows only hosts the host lists. |
| `update-subscription` (renamed `Update Record`) | `records.update(change)` |
| `enroll` (`Run Workflow`) | `flows.get(id)`; starts that flow as a child run and waits, linking the two run ids. |

The ten sample workflows each declare sample outputs, so they simulate out of the box with no setup. They are for showing how a workflow is built; they are not meant to do real work.

### 6.7 Human review and pausing

`review` with `Human approves` puts the step in `waiting` and the run in `paused`. The run continues on `approve(stepId, { note })` or ends on `reject(stepId, { reason })`. The UI shows an Approve / Reject bar on the step; MCP exposes the same two calls. A paused run survives a page reload if the run store is persistent.

### 6.8 Events and API

```ts
const run = runner.run(graph, { trigger, from?: stepId, maxParallel? })

run.events      // AsyncIterable<RunEvent>: run.started, step.started, step.finished, step.failed,
                // step.waiting, edge.taken, log, run.paused, run.finished
run.result      // Promise<RunRecord>
run.stop()      run.approve(id)   run.reject(id)

// store-bound helpers, so the existing canvas keeps working:
startRun(options?)  stopRun()  approveStep(id)  rejectStep(id)
```


## 7. Run records and logs

```ts
RunRecord {
  id, flowId, flowHash,            // hash of the behaviour part of the graph at run time
  status: 'running'|'paused'|'done'|'failed'|'stopped',
  trigger, startedAt, finishedAt,
  steps: StepRun[],
  logs: LogEntry[]
}
StepRun  { nodeId, status: 'pending'|'running'|'waiting'|'done'|'failed'|'skipped',
           attempt, startedAt, endedAt, input, output, port, error? }
LogEntry { t, level: 'debug'|'info'|'success'|'warning'|'error', runId, nodeId|null, message, data? }
```

- **Run store** interface (`list`, `get`, `put`, `delete`, `prune(keepLast)`): in-memory by default, an IndexedDB adapter for the browser, a JSON-file adapter for Node. Default keeps the last 50 runs.
- **Redaction:** `${secret.*}` and any value matching the host's redact list are replaced with `•••` in `data` before a log is stored or exported.
- **Large outputs** are truncated in the log (default 4 KB) with the full value kept on the `StepRun`.
- **In an export:** when "Include latest test run" is on, the JSON export gains a `testRun` block (status, start and end, the log entries) and the Markdown export gains a "Latest test run" section. Off, neither appears.

## 8. UI changes (in `machines-ui`)

Replace the simulation and wire the engine in. Nothing here needs a new look; reuse the existing panels.

- **Node status:** `FlowNode.status` follows the run: idle → running → done / warning / error / waiting. `statusLabel` shows the attempt or the port taken ("TRUE"). A pinned `view.status` still wins.
- **Canvas:** the active edge animates; taken edges stay lit; skipped branches dim.
- **Run controls** (new bar, at the top of the canvas): Run (opens a small payload editor for the trigger, JSON, with last-used remembered), Run once (default payload), Stop. A run whose steps were stand-ins shows a **Simulated** badge.
- **Inspector → Status tab:** the selected step's last attempt: input, output, port, duration, error, with a copy button.
- **Inspector → Logs tab:** the run history picker, level and step filters, text search, "follow" toggle.
- **Export dialog:** two formats, **Workflow JSON** (lossless, `machines.flow/1`) and **Markdown brief**. One toggle, **Include latest test run**. Download and Copy contents. An **Import** card loads a Workflow JSON back (drop a file or paste); problems are listed with step names, and a valid file opens as a new workflow. The CSV report and the "Include step rules" toggle are removed (rules are always part of the JSON). The made-up curl snippet is removed.
- **Honest copy:** remove "Re-import it" wording until import ships; remove subscriber/email-marketing language from step defaults and the run log (already done for most).

## 9. MCP

The Connect dialog shows **one thing**: the MCP server config JSON for this workflow, with a Copy button, under this note:

> **This is the shape of the MCP server for this workflow. To actually run the server, please host it. This site does not provide hosting.**

The dialog no longer shows the sample prompt, the tool list, the "Not connected" status or "N steps exposed". The editor generates no server code, publishes no MCP package, and has no connection to any MCP client.

### 9.1 The config is derived from the workflow

The config is not a template with one fixed shape. It is computed from the workflow's own steps, as if that workflow were real and someone were going to host it: the server is named after the workflow, and the `env` block lists one variable for each outside thing its steps would need. For example, the Jev Router:

```json
{
  "mcpServers": {
    "jev-router": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "jev-router"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "JEV_API_KEY": "<your Jev key>",
        "SOL_API_KEY": "<your Sol key>"
      }
    }
  }
}
```

The rule, the same for the ten samples and for any workflow a user builds:

| Part | Value |
|---|---|
| Server name and `--workflow` | The workflow's name as a slug (`Jev Router` → `jev-router`). Renaming the workflow renames it. |
| `command`, `args` | `npx -y <your-mcp-server> --workflow <slug>`. `<your-mcp-server>` is a placeholder for whatever the user hosts. |
| One variable per distinct model in the workflow's **Run Agent** steps | `<MODEL>_API_KEY`, from the first word of the step's `rules.model` (`Jev (classifier)` → `JEV_API_KEY`). Value `<your Jev key>`. |
| Any **Send Email** step | `MAIL_API_KEY` = `<your mail key>` |
| Any **Update Record** step | `RECORDS_API_KEY` = `<your records key>` |
| **Send Webhook** steps | `WEBHOOK_URL` = `<url to call>`; with several, `WEBHOOK_URL_1`, `WEBHOOK_URL_2`, … in step order |
| Any **Read Source** or **Write Output** step | `FILES_DIR` = `<folder path>` |
| Any **Run Workflow** step | `WORKFLOWS_DIR` = `<folder path>` |
| Steps that need nothing outside | Trigger, Branch, Transform, Review, Wait Until and Time Delay add nothing. A workflow made only of those has no `env` block. |

Order is fixed (models in order of first appearance, then mail, records, webhooks, files, workflows), so the same workflow always yields the same text. Values are always placeholders: the editor never holds a real key, and a real key is never written into a workflow file, an export or a log.

For a workflow the user is building, the config follows the canvas: add a Send Webhook step and `WEBHOOK_URL` appears; remove the last agent that used Sol and `SOL_API_KEY` goes; rename the workflow and the server name changes.

### 9.2 The ten samples

Each sample ships with its config, kept as a snapshot next to the sample. A test asserts that the snapshot equals what the rule above produces from the sample's steps, so the two cannot drift apart.

**Before the snapshots are final, the samples need one fix:** nine agent steps declare no model, so the rule could only give them a generic `MODEL_API_KEY`. In P2 each gets `rules.model` set (all to `Luna (worker)`, the worker model). The configs below already assume that.

| Sample | Steps that need something outside | Env variables |
|---|---|---|
| Jev Router | 5 agent steps (Luna, Jev, Sol) | `LUNA_API_KEY`, `JEV_API_KEY`, `SOL_API_KEY` |
| JSON to Markdown | 1 agent step (Luna), 1 Read, 1 Write | `LUNA_API_KEY`, `FILES_DIR` |
| LLM Wiki | 3 agent steps (Luna), 1 Read, 1 Write, 1 Webhook | `LUNA_API_KEY`, `WEBHOOK_URL`, `FILES_DIR` |
| Pull Request Review | 1 agent step (Sol), 1 Read, 2 Write, 1 Webhook | `SOL_API_KEY`, `WEBHOOK_URL`, `FILES_DIR` |
| Support Triage | 2 agent steps (Jev, Luna), 1 Email, 1 Update Record, 1 Webhook | `JEV_API_KEY`, `LUNA_API_KEY`, `MAIL_API_KEY`, `RECORDS_API_KEY`, `WEBHOOK_URL` |
| Meeting Notes | 2 agent steps (Luna), 1 Write, 1 Email | `LUNA_API_KEY`, `MAIL_API_KEY`, `FILES_DIR` |
| Weekly Report | 1 agent step (Luna), 1 Read, 1 Email, 1 Run Workflow | `LUNA_API_KEY`, `MAIL_API_KEY`, `FILES_DIR`, `WORKFLOWS_DIR` |
| Release Notes | 2 agent steps (Luna), 1 Read, 1 Write | `LUNA_API_KEY`, `FILES_DIR` |
| Translate a Post | 2 agent steps (Luna), 1 Write | `LUNA_API_KEY`, `FILES_DIR` |
| Incident Response | 1 agent step (Sol), 1 Read, 1 Write, 1 Webhook, 1 Run Workflow | `SOL_API_KEY`, `WEBHOOK_URL`, `FILES_DIR`, `WORKFLOWS_DIR` |

The full configs:

**Jev Router**

```json
{
  "mcpServers": {
    "jev-router": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "jev-router"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "JEV_API_KEY": "<your Jev key>",
        "SOL_API_KEY": "<your Sol key>"
      }
    }
  }
}
```

**JSON to Markdown**

```json
{
  "mcpServers": {
    "json-to-markdown": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "json-to-markdown"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "FILES_DIR": "<folder path>"
      }
    }
  }
}
```

**LLM Wiki**

```json
{
  "mcpServers": {
    "llm-wiki": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "llm-wiki"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "WEBHOOK_URL": "<url to call>",
        "FILES_DIR": "<folder path>"
      }
    }
  }
}
```

**Pull Request Review**

```json
{
  "mcpServers": {
    "pull-request-review": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "pull-request-review"],
      "env": {
        "SOL_API_KEY": "<your Sol key>",
        "WEBHOOK_URL": "<url to call>",
        "FILES_DIR": "<folder path>"
      }
    }
  }
}
```

**Support Triage**

```json
{
  "mcpServers": {
    "support-triage": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "support-triage"],
      "env": {
        "JEV_API_KEY": "<your Jev key>",
        "LUNA_API_KEY": "<your Luna key>",
        "MAIL_API_KEY": "<your mail key>",
        "RECORDS_API_KEY": "<your records key>",
        "WEBHOOK_URL": "<url to call>"
      }
    }
  }
}
```

**Meeting Notes**

```json
{
  "mcpServers": {
    "meeting-notes": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "meeting-notes"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "MAIL_API_KEY": "<your mail key>",
        "FILES_DIR": "<folder path>"
      }
    }
  }
}
```

**Weekly Report**

```json
{
  "mcpServers": {
    "weekly-report": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "weekly-report"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "MAIL_API_KEY": "<your mail key>",
        "FILES_DIR": "<folder path>",
        "WORKFLOWS_DIR": "<folder path>"
      }
    }
  }
}
```

**Release Notes**

```json
{
  "mcpServers": {
    "release-notes": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "release-notes"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "FILES_DIR": "<folder path>"
      }
    }
  }
}
```

**Translate a Post**

```json
{
  "mcpServers": {
    "translate-a-post": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "translate-a-post"],
      "env": {
        "LUNA_API_KEY": "<your Luna key>",
        "FILES_DIR": "<folder path>"
      }
    }
  }
}
```

**Incident Response**

```json
{
  "mcpServers": {
    "incident-response": {
      "command": "npx",
      "args": ["-y", "<your-mcp-server>", "--workflow", "incident-response"],
      "env": {
        "SOL_API_KEY": "<your Sol key>",
        "WEBHOOK_URL": "<url to call>",
        "FILES_DIR": "<folder path>",
        "WORKFLOWS_DIR": "<folder path>"
      }
    }
  }
}
```

## 10. Testing

Unit (engine, headless, fake clock, seeded randomness):
- Each executor, each condition operator, join semantics, fan-out ordering with `maxParallel: 1`, retry and backoff, timeout, stop, human approve/reject, cycle limits.
- **Sample-flow conformance:** for each of the ten samples, simulate with the declared sample outputs and assert the path taken and the final output. Jev Router with score 0.82 takes Sol; with 0.2 takes Luna. JSON→Markdown with invalid JSON takes the repair branch.
- Round-trip: `importFlow(exportFlow(g))` equals `g` for all samples, plus generated random graphs.
- Export: JSON and Markdown, each with and without the test run log, for every sample; the log appears only when the toggle is on.

Integration:
- Existing `test-machine` site: runs all ten samples through the **public** API, checks node statuses on the canvas, log counts, export → import → same graph, a human-approval flow end to end.
- Connect dialog: the JSON is valid and the note is shown above it. For every sample the stored snapshot equals the config derived from its steps. For a built-up workflow, adding a webhook step adds `WEBHOOK_URL`, removing the last step that used a model removes that key, and renaming the workflow renames the server. The same workflow always yields byte-identical text.


## 11. Phasing and acceptance

| Phase | Delivers | Done when |
|---|---|---|
| **P1 Format** | `machines.flow/1` schema, `validateGraph`, `exportFlow`, `importFlow`, the Export dialog (JSON, Markdown, log toggle) and the Import card | All ten samples round-trip losslessly; invalid files give per-step messages; the UI no longer promises re-import it can't do |
| **P2 Engine** | Headless runner, built-in executors, adapters with in-memory stubs, run records, run store, events | All ten samples simulate along the right path from their sample outputs and the conformance assertions pass; every agent step in the samples declares its model; `startRun` and friends are **exported from the package** (closes the gap the test site found) |
| **P3 UI** | Node status from the run, run controls, payload editor, Status and Logs tabs, history, human approval bar | The canvas shows a real run; two canvases can run independently |
| **P4 Connect dialog** | The config derived from the workflow (9.1), the note, one Copy button; each sample's config kept as a snapshot | The dialog shows only that; for every sample the snapshot equals the derived config; adding or removing a step on the canvas changes the config as the rule says |
| **P5 Adapters** | The documented adapter interfaces for hosts; redaction; allowlists; per-step timeouts | A host's webhook adapter runs against a local test server in the integration test; a call to an unlisted host is refused and logged |
| **P6 Docs and release** | Docs pages for the engine and the file format; `test-machine` covers all of it; version bump and publish | Docs gate and test report green |

Order is strict for P1 → P2 → P3; P4 depends on nothing and can ship at any point.

## 12. Decisions

Settled:
- **D1.** The engine is a subpath of `machines-ui` (`/engine`).
- **Model calls:** the library ships no provider code. Agent steps are answered by a stand-in unless the host supplies an adapter.
- **No live mode in the library.** A run is a simulation until the host supplies adapters.
- **Export:** JSON and Markdown, with or without the latest test run log.
- **MCP:** the config JSON and the note, nothing more.

Open:
1. **`<your-mcp-server>` in `args`** stays a placeholder, since no MCP package exists. Is that right, or should it hold something else?
2. **Samples get a model on every agent step** (all `Luna (worker)` where none is set). Is Luna right for those, or would you like different models on some?
3. **Rename the stored kinds** `update-subscription` to `update-record` and `enroll` to `run-workflow` now, before the format is frozen at version 1? Recommended: yes, with a one-line migration for old files.
