#!/usr/bin/env node
// End-to-end test of /creator in a real browser: pick each sample, press Run, and check what the canvas, the panels,
// the Export dialog and the Connect dialog show. Needs the dev server (DOCS_URL, default http://localhost:5175).
//   pnpm exec vite dev --port 5175 &   then   node scripts/e2e-creator.ts
import { chromium } from 'playwright-core';

const BASE = process.env.DOCS_URL ?? 'http://localhost:5175';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await (await browser.newContext({ viewport: { width: 1700, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' })).newPage();
const errors: string[] = [];
const results: boolean[] = [];

page.on('pageerror', (e) => errors.push(String(e).split('\n')[0].slice(0, 200)));

const t = (name: string, ok: boolean, note = '') => { results.push(ok); console.log(`${ok ? 'pass' : 'FAIL'}  ${name}${note ? '  ' + note : ''}`); };
const SAMPLES = ['Jev Router', 'JSON to Markdown', 'LLM Wiki', 'Pull Request Review', 'Support Triage', 'Meeting Notes', 'Weekly Report', 'Release Notes', 'Translate a Post', 'Incident Response'];
const EXPECT: Record<string, number> = { 'Jev Router': 7, 'JSON to Markdown': 5, 'LLM Wiki': 8, 'Pull Request Review': 6, 'Support Triage': 7, 'Meeting Notes': 6, 'Weekly Report': 8, 'Release Notes': 7, 'Translate a Post': 5, 'Incident Response': 7 };
const HUMAN = ['Support Triage', 'Release Notes'];

await page.goto(`${BASE}/creator`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);

const choose = async (name: string) => {
	await page.getByRole('listbox', { name: 'Workflows' }).getByRole('option', { name, exact: true }).click();
	await page.waitForTimeout(900);
};
const runAgain = async () => {
	await page.getByRole('button', { name: 'Run', exact: true }).click();
	await page.waitForTimeout(1500);
	await page.waitForFunction(() => /Done/.test(document.querySelector('.fl-flow-run-bar-status')?.textContent ?? ''), null, { timeout: 15000 });
};
const status = () => page.locator('.fl-flow-run-bar-status').innerText().catch(() => '');
const nodeStates = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-node]')].map((n) => ({ id: n.dataset.node as string, status: n.querySelector('[data-status]')?.getAttribute('data-status') })));

for (const name of SAMPLES) {
	await choose(name);
	const total = await page.locator('[data-node]').count();
	await page.getByRole('button', { name: 'Run', exact: true }).click();

	if (HUMAN.includes(name)) {
		await page.waitForSelector('[aria-label="Waiting for a person"]', { timeout: 15000 });
		t(`${name}: pauses for a person`, (await status()).includes('Paused'), await status());
		const waitingLabel = await page.evaluate(() => [...document.querySelectorAll('[data-node] [data-status="warning"]')].length);
		t(`${name}: the waiting step shows a warning status on the canvas`, waitingLabel >= 1, `${waitingLabel} node(s)`);
		await page.locator('[aria-label="Waiting for a person"]').getByRole('button', { name: 'Approve' }).first().click();
	}

	await page.waitForFunction(() => /Done|Failed|Stopped/.test(document.querySelector('.fl-flow-run-bar-status')?.textContent ?? ''), null, { timeout: 20000 });
	const states = await nodeStates();
	const done = states.filter((s) => s.status === 'done').length;
	t(`${name}: the run finishes and ${EXPECT[name]} steps are done`, /Done/.test(await status()) && done === EXPECT[name], `${await status()}; done ${done} of ${total}`);
	t(`${name}: it says it was a simulation`, /simulated/.test(await status()));
	t(`${name}: no step failed`, !states.some((s) => s.status === 'error'));
}

// ── one workflow in depth: Jev Router ───────────────────────────────────────────
await choose('Jev Router');
await page.getByRole('button', { name: 'Run', exact: true }).click();
await page.waitForFunction(() => /Done/.test(document.querySelector('.fl-flow-run-bar-status')?.textContent ?? ''), null, { timeout: 15000 });
const branchLabel = await page.evaluate(() => [...document.querySelectorAll('[data-node="jev-complex"] [data-status]')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()).join('|'));
t('the branch step shows the path it took', /TRUE/.test(branchLabel), branchLabel);
const skipped = await nodeStates();
t('the steps on the path not taken stay idle', ['jev-resume', 'jev-simple'].every((id) => skipped.find((s) => s.id === id)?.status === 'idle'));

// the inspector: three tabs, Props, Build and Logs
await page.locator('[data-node="jev-classify"] [role="button"]').first().dispatchEvent('pointerdown', { button: 0, bubbles: true });
await page.mouse.up();
const tabs = (await page.getByRole('tab').allInnerTexts()).map((x) => x.trim().split('\n')[0]).join();
t('the step panel has the tabs Props, Build and Logs', tabs === 'Props,Build,Logs', tabs);
await page.getByRole('tab', { name: 'Logs' }).click().catch(() => page.getByText('Logs', { exact: true }).first().click());
await page.waitForTimeout(400);
const logText = await page.locator('[aria-label="Run log"]').innerText();
t('the Logs tab shows this step\'s lines', /Jev classifies the prompt/.test(logText) || /Stand-in: Jev/.test(logText), logText.replace(/\s+/g, ' ').slice(0, 100));
await page.getByRole('button', { name: 'All steps' }).click();
await page.waitForTimeout(300);
const allCount = await page.locator('[aria-label="Run log"] li').count();
t('All steps shows the whole run', allCount > 15, `${allCount} lines`);
await page.getByPlaceholder('Search').fill('Sol');
await page.getByPlaceholder('Search').press('Tab');
await page.waitForTimeout(300);
const found = await page.locator('[aria-label="Run log"] li').count();
t('the search narrows the log', found > 0 && found < allCount, `${found} of ${allCount}`);
await page.getByPlaceholder('Search').fill('');

// editing the sample output changes the path the next run takes
await page.locator('[data-node="jev-classify"] [role="button"]').first().dispatchEvent('pointerdown', { button: 0, bubbles: true });
await page.mouse.up();
await page.getByRole('tab', { name: 'Build' }).click().catch(() => page.getByText('Build', { exact: true }).first().click());
await page.waitForTimeout(400);
const sampleBox = page.getByLabel('Sample output');
await sampleBox.fill('{"label":"simple","score":0.2}');
await sampleBox.blur();
await page.waitForTimeout(300);
await runAgain();
const after = await nodeStates();
t('a lower sample score sends the next run to Luna instead of Sol', after.find((s) => s.id === 'jev-simple')?.status === 'done' && after.find((s) => s.id === 'jev-plan')?.status === 'idle', after.map((x) => x.id.replace('jev-', '') + ':' + x.status).join(' '));

// the payload
await page.getByRole('button', { name: 'Payload' }).click();
await page.locator('#run-payload-text').fill('{"prompt":"x","session":{"id":1}}');
await runAgain();
const resumed = await nodeStates();
t('a payload with a saved session takes the resume path', resumed.find((s) => s.id === 'jev-resume')?.status === 'done' && resumed.find((s) => s.id === 'jev-classify')?.status === 'idle', resumed.map((x) => x.id.replace('jev-', '') + ':' + x.status).join(' '));
await page.locator('#run-payload-text').fill('{not json');
t('an invalid payload disables Run', await page.getByRole('button', { name: 'Run', exact: true }).isDisabled());
await page.locator('#run-payload-text').fill('');

// the run history
await page.locator('[data-node="jev-classify"] [role="button"]').first().dispatchEvent('pointerdown', { button: 0, bubbles: true });
await page.mouse.up();
await page.getByRole('tab', { name: 'Logs' }).click().catch(() => page.getByText('Logs', { exact: true }).first().click());
await page.waitForTimeout(500);
const history = await page.evaluate(() => document.body.innerText.match(/Run #\d+/g)?.length ?? 0);
t('the Logs tab keeps the history of runs', history >= 1, `${history} labelled run(s) visible`);

// ── export with and without the run log ─────────────────────────────────────────
await page.getByRole('button', { name: 'Export', exact: true }).click();
await page.waitForTimeout(700);
const dialog = page.locator('[role="dialog"]').first();
const txt = async () => dialog.locator('[aria-label="Preview"]').innerText();
t('Export offers JSON and Markdown only', (await dialog.locator('[role="radio"]').count()) === 2);
t('the JSON has no test run until the toggle is on', !(await txt()).includes('testRun'));
await dialog.locator('#export-logs').click();
await page.waitForTimeout(400);
t('with the toggle on, the JSON carries the latest run\'s log', (await txt()).includes('testRun') && /Run finished/.test(await txt()));
await dialog.locator('[role="radio"]').nth(1).click();
await page.waitForTimeout(300);
t('and so does the Markdown', /Latest test run/.test(await txt()));
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// ── connect ─────────────────────────────────────────────────────────────────────
await page.getByRole('button', { name: 'Connect MCP' }).click();
await page.waitForTimeout(500);
const mcp = await page.locator('[role="dialog"]').first().innerText();
t('the Connect dialog shows the hosting note', /please host it\. This site does not provide hosting\./.test(mcp.replace(/\s+/g, ' ')));
const cfg = JSON.parse(await page.locator('[role="dialog"] pre code').first().innerText());
t('and the config for this workflow', 'jev-router' in cfg.mcpServers && ['LUNA_API_KEY', 'JEV_API_KEY', 'SOL_API_KEY'].every((k) => k in cfg.mcpServers['jev-router'].env));
await page.keyboard.press('Escape');

t('no page errors during the whole session', errors.length === 0, errors.slice(0, 2).join(' | '));
console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
