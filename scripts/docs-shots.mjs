#!/usr/bin/env node
// Visual baseline for the component docs: screenshots every live preview on
// /docs/<slug> and compares against qa/baseline. Run it before and after any
// styling change (Tailwind → Sass, <style> → Sass) to prove nothing moved.
//
//   node scripts/docs-shots.mjs --update        write qa/baseline
//   node scripts/docs-shots.mjs                 compare against it
//   node scripts/docs-shots.mjs graph-kpi graph # only these slugs
//
// Needs the dev server up (DOCS_URL, default http://localhost:5173).
// Determinism: reduced motion (the components freeze a seeded frame), a
// fixed clock, a fixed viewport, and fonts awaited before each shot.
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.DOCS_URL ?? 'http://localhost:5173';
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const dir = (n) => join(root, 'qa', n);
const update = process.argv.includes('--update');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
// share of pixels allowed to differ before a shot counts as changed
const TOLERANCE = Number(process.env.TOLERANCE ?? 0.002);

const components = JSON.parse(readFileSync(join(root, 'src/docs/data/components.json'), 'utf8')).components;
const slugs = components.filter((c) => c.exported).map((c) => c.slug).filter((s) => !only.length || only.includes(s));

const out = update ? dir('baseline') : dir('current');
const fresh = (d) => {
	rmSync(d, { recursive: true, force: true });
	mkdirSync(d, { recursive: true });
};

// a full run starts clean; a subset only replaces its own shots
if (update && only.length) {
	mkdirSync(out, { recursive: true });
	for (const f of existsSync(out) ? readdirSync(out) : []) {
		if (only.some((s) => new RegExp(`^${s}-\\d+\\.png$`).test(f))) rmSync(join(out, f));
	}
} else {
	fresh(out);
}

if (!update) fresh(dir('diff'));

const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
// one context per page: a crashing page cannot take its neighbours down
const newContext = () =>
	browser.newContext({
		viewport: { width: 1500, height: 1000 },
		deviceScaleFactor: 1,
		reducedMotion: 'reduce',
		colorScheme: 'dark'
	});

async function shoot(slug) {
	const context = await newContext();
	const page = await context.newPage();
	await page.clock.setFixedTime(new Date('2026-06-01T12:00:00Z'));
	const files = [];

	try {
		await page.goto(`${BASE}/docs/${slug}`, { waitUntil: 'networkidle', timeout: 45000 });
		await page.evaluate(() => document.fonts.ready);

		const examples = page.locator('.docs-example');
		const n = await examples.count();

		for (let i = 0; i < n; i++) {
			const ex = examples.nth(i);
			// frames (flow demos) need their own page to settle
			const frame = ex.locator('iframe');

			if (await frame.count()) {
				await page.waitForTimeout(3000);
			}

			// shoot the preview only — the code block below it is text, not styling
			const stage = ex.locator('.docs-stage, iframe').first();

			await page.waitForTimeout(250);
			const name = `${slug}-${i}.png`;

			await stage.screenshot({ path: join(out, name), animations: 'disabled', caret: 'hide' });
			files.push(name);
		}
	} finally {
		await context.close();
	}

	return files;
}

const queue = [...slugs];
const taken = [];
const errors = [];

await Promise.all(
	Array.from({ length: 4 }, async () => {
		while (queue.length) {
			const slug = queue.shift();

			// a page can crash under parallel load: retry once before failing
			for (let attempt = 0; attempt < 2; attempt++) {
				try {
					taken.push(...(await shoot(slug)));
					break;
				} catch (e) {
					if (attempt) errors.push(`${slug}: ${e.message.split('\n')[0]}`);
				}
			}
		}
	})
);

await browser.close();

if (update) {
	console.log(`baseline written: ${taken.length} shots from ${slugs.length} pages → qa/baseline`);
	for (const e of errors) console.log('  ✗', e);
	process.exit(errors.length ? 1 : 0);
}

// ── compare ───────────────────────────────────────────────────────────────────
const baseDir = dir('baseline');
const known = existsSync(baseDir) ? readdirSync(baseDir).filter((f) => f.endsWith('.png')) : [];
const scope = (f) => !only.length || only.some((s) => new RegExp(`^${s}-\\d+\\.png$`).test(f) || f === `${s}.png`);
const changed = [];
const missing = known.filter(scope).filter((f) => !taken.includes(f));
const added = taken.filter((f) => !known.includes(f));

for (const name of taken.filter((f) => known.includes(f)).sort()) {
	const a = PNG.sync.read(readFileSync(join(baseDir, name)));
	const b = PNG.sync.read(readFileSync(join(dir('current'), name)));

	if (a.width !== b.width || a.height !== b.height) {
		changed.push({ name, why: `size ${a.width}×${a.height} → ${b.width}×${b.height}` });
		continue;
	}

	const diff = new PNG({ width: a.width, height: a.height });
	const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 });
	const ratio = px / (a.width * a.height);

	if (ratio > TOLERANCE) {
		writeFileSync(join(dir('diff'), name), PNG.sync.write(diff));
		changed.push({ name, why: `${(ratio * 100).toFixed(2)}% of pixels differ` });
	}
}

console.log(`compared ${taken.length - added.length} shots from ${slugs.length} pages (tolerance ${TOLERANCE * 100}%)`);
for (const c of changed) console.log('  ≠', c.name, '—', c.why);
for (const m of missing) console.log('  − missing', m);
for (const a of added) console.log('  + new', a);
for (const e of errors) console.log('  ✗', e);
console.log(changed.length || missing.length || errors.length ? 'FAIL' : 'OK: no visual change');
process.exit(changed.length || missing.length || errors.length ? 1 : 0);
