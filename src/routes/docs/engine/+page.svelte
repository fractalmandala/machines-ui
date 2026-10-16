<script lang="ts">
	import CodeBlock from '$site/components/docs/code-block.svelte';
	import TocMenu from '$site/components/docs/toc-menu.svelte';

	const KINDS = [
		['Receive Trigger', 'Starts the run with the payload.'],
		['Read Source / Write Output', 'Storage adapter, or a stand-in.'],
		['Run Agent', 'One adapter function per model name, or a stand-in answer.'],
		['Transform', 'JSON, Markdown, CSV, HTML and text conversions, run for real.'],
		['Branch', 'Conditions on earlier outputs; takes the true or false port.'],
		['Review', 'Waits for a person, or checks a condition or a test result.'],
		['Wait', 'A delay; skipped by the fast clock.'],
		['Loop', 'Runs again until its exit condition holds, bounded by the limits.'],
		['Send Email / Send Webhook / Update Record', 'Adapters; webhooks only reach allowed hosts.'],
		['Run Workflow', 'Runs another workflow through the flows adapter.']
	];
</script>

<svelte:head><title>Engine and file format — machines-ui</title></svelte:head>

<section class="fs-content-section fs-narrow-full fs-box fs-gap-xl">
	<TocMenu />
	<header class="docs-header fs-box fs-gap-sm">
		<span class="docs-kicker">Guides</span>
		<h1 class="docs-title">Engine and file format</h1>
		<p class="docs-lede">
			The workflow file, the checks on it, the MCP config it implies, and an engine that runs it. All of it is plain
			TypeScript with no DOM and no Svelte, so it runs in a browser, in Node, or in a test.
		</p>
	</header>

	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Install</h2>
		<CodeBlock code="pnpm add @fractaldesign/machines-ui" lang="shell" />
		<CodeBlock
			code={`import { exportFlow, exportMarkdown, importFlow, validateGraph, createRunner, mcpConfigText } from '@fractaldesign/machines-ui/engine';
import { fileRunStore } from '@fractaldesign/machines-ui/engine/node'; // Node only`}
			lang="ts"
		/>
	</section>

	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">The file</h2>
		<p class="docs-note">
			<span class="docs-mono">machines.flow/1</span> is one JSON document: the name, the steps, the connections and, if you ask for it,
			the log of a test run. Export then import gives back the same graph. Import reports what is wrong with a file by path, and
			renames older step kinds.
		</p>
		<CodeBlock
			code={`const meta = { id: 'support', name: 'Support Triage', description: '' };
const doc = exportFlow(graph, meta, { testRun });      // the document; JSON.stringify(doc) is the file
const markdown = exportMarkdown(graph, meta, { testRun });

const { graph, meta, warnings } = importFlow(text);   // text or parsed JSON; throws FlowParseError with problems[]
const problems = validateGraph(graph);                // { code, message, nodeId? }[]`}
			lang="ts"
		/>
	</section>

	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Running</h2>
		<p class="docs-note">
			A step runs when its inputs have arrived. Parallel branches run together, a join waits for all of its live inputs, and loops
			stop at <span class="docs-mono">maxVisitsPerStep</span> and <span class="docs-mono">maxSteps</span>. With no adapters the engine
			simulates: agents answer from each step's sample output, and the run is marked simulated.
		</p>
		<CodeBlock
			code={`const runner = createRunner({ adapters, env: { OPENAI_API_KEY }, limits: { timeoutMs: 20_000 } });

const run = runner.run(graph, { trigger: { prompt: 'hi' } });
run.subscribe((event) => console.log(event.type));   // run.started, step.finished, edge.taken, run.finished …
const record = await run.result;                     // status, steps, logs, simulated

run.approve('support-approve');                      // a Review step waiting for a person
const again = runner.resume(graph, record);          // pick a paused run back up`}
			lang="ts"
		/>
		<div class="docs-table-wrap">
			<table class="docs-table">
				<thead><tr><th>Step</th><th>What it does when run</th></tr></thead>
				<tbody>
					{#each KINDS as [name, text]}<tr><td>{name}</td><td>{text}</td></tr>{/each}
				</tbody>
			</table>
		</div>
		<p class="docs-note">
			Each step can set <span class="docs-mono">onError</span> (stop, continue or retry), <span class="docs-mono">attempts</span>,
			<span class="docs-mono">backoffMs</span> and <span class="docs-mono">timeoutMs</span>. Values that look like secrets are blanked
			out of every log and output.
		</p>
	</section>

	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Adapters</h2>
		<p class="docs-note">The package ships these interfaces and the stand-ins, and no provider code. Pass only what you have.</p>
		<CodeBlock
			code={`createRunner({
	adapters: {
		agents: { 'Luna (worker)': async ({ prompt, input }) => callYourModel(prompt, input) },
		mail: { send: async (message) => yourMailer(message) },
		http: { allow: ['hooks.example.com'] },        // webhooks reach only these hosts
		storage: { read, write },
		records: { update },
		flows: { get },
		tests: { run }
	}
});`}
			lang="ts"
		/>
	</section>

	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">Stores and clocks</h2>
		<p class="docs-note">
			Runs are kept in a <span class="docs-mono">RunStore</span>: <span class="docs-mono">memoryRunStore()</span>, 
			<span class="docs-mono">indexedDbRunStore()</span> in a browser, <span class="docs-mono">fileRunStore(dir)</span> in Node. The
			fast clock skips waits and is what simulation uses; the real clock waits.
		</p>
	</section>

	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">MCP config</h2>
		<p class="docs-note">
			<span class="docs-mono">mcpConfigText(name, graph)</span> returns the config an MCP client would use for the workflow: the
			server key, the command, and the environment variables its steps imply. It is the shape of the server, not a server: to run
			it, host it yourself. This package does not provide hosting.
		</p>
	</section>

	<section class="docs-section fs-box fs-gap-bs">
		<h2 class="docs-h2">In the canvas</h2>
		<p class="docs-note">
			The same engine drives the Run button, the Status and Logs tabs, Export and Connect MCP in the
			<a href="/creator">creator</a>. From code, <span class="docs-mono">startRun</span>, <span class="docs-mono">stopRun</span>,
			<span class="docs-mono">approveStep</span> and <span class="docs-mono">rejectStep</span> are exported from the package root.
		</p>
	</section>
</section>
