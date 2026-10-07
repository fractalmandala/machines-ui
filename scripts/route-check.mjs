#!/usr/bin/env node
// Checks the edge router (src/lib/core/route.ts) on every pair of port sides, from many
// relative positions of the two nodes. No browser, no build: pure geometry.
//
//   node scripts/route-check.mjs                  run the checks (exit 1 on any violation)
//   node scripts/route-check.mjs --sheet out.svg  also draw the cases into one SVG
//
// A route is valid when it: starts and ends on its ports; leaves and enters square to the
// node's edge; runs only horizontally or vertically (one straight snap excepted); never
// doubles back, repeats a point, or has a pointless extra corner; never cuts through either
// node; stays within a corner budget; and comes out the same every time.
import { writeFileSync } from 'node:fs';
import { routeEdge, sideNormal } from '../src/lib/core/route.ts';

const SIDES = ['top', 'right', 'bottom', 'left'];
const W = 400;
const H = 120;
const MAX_CORNERS = 6;

const box = (x, y) => ({ x, y, width: W, height: H });
const anchor = (b, side) =>
	({
		top: { x: b.x + W / 2, y: b.y },
		right: { x: b.x + W, y: b.y + H / 2 },
		bottom: { x: b.x + W / 2, y: b.y + H },
		left: { x: b.x, y: b.y + H / 2 }
	})[side];
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const dir = (a, b) => ({ x: Math.sign(b.x - a.x), y: Math.sign(b.y - a.y) });
const eq = (a, b) => a.x === b.x && a.y === b.y;

function cuts(a, b, bx) {
	const [l, r, t, bt] = [bx.x, bx.x + bx.width, bx.y, bx.y + bx.height];

	if (a.x === b.x) {
		const [lo, hi] = a.y < b.y ? [a.y, b.y] : [b.y, a.y];

		return a.x > l && a.x < r && lo < bt && hi > t;
	}

	const [lo, hi] = a.x < b.x ? [a.x, b.x] : [b.x, a.x];

	return a.y > t && a.y < bt && lo < r && hi > l;
}

// target positions: offsets of its top-left corner from the source's, skipping overlapping boxes
const OFFSETS = [];

for (const dx of [-700, -250, 0, 40, 250, 700]) for (const dy of [-420, -170, -40, 0, 40, 170, 420]) OFFSETS.push([dx, dy]);

const source = box(0, 0);
const problems = [];
const cases = [];

for (const fromSide of SIDES) {
	for (const toSide of SIDES) {
		for (const [dx, dy] of OFFSETS) {
			const target = box(dx, dy);

			if (overlaps(source, target)) continue;

			const from = { point: anchor(source, fromSide), side: fromSide, box: source };
			const to = { point: anchor(target, toSide), side: toSide, box: target };
			const path = routeEdge(from, to);
			const record = { fromSide, toSide, dx, dy, path, ok: true };
			const fail = (why) => {
				problems.push(`${fromSide}→${toSide} @ ${dx},${dy}: ${why}`);
				record.ok = false;
			};

			cases.push(record);

			if (!eq(path[0], from.point)) fail('does not start on the source port');
			if (!eq(path.at(-1), to.point)) fail('does not end on the target port');

			if (path.length < 2) {
				fail('fewer than two points');
				continue;
			}

			const straightSnap = path.length === 2;
			const na = sideNormal(fromSide);
			const nb = sideNormal(toSide);

			if (!straightSnap) {
				const first = dir(path[0], path[1]);
				const last = dir(path.at(-2), path.at(-1));

				if (!eq(first, na)) fail(`leaves ${JSON.stringify(first)}, not out of the ${fromSide} side`);
				if (!(last.x === -nb.x && last.y === -nb.y)) fail(`enters ${JSON.stringify(last)}, not into the ${toSide} side`);
			} else if (!(na.x === -nb.x && na.y === -nb.y)) {
				// a straight snap is only allowed between facing ends
				fail('straight line between ends that do not face each other');
			}

			for (let i = 1; i < path.length; i++) {
				const step = dir(path[i - 1], path[i]);

				if (eq(path[i - 1], path[i])) fail('repeated point');
				if (!straightSnap && step.x !== 0 && step.y !== 0) fail('diagonal segment');

				if (i > 1) {
					const before = dir(path[i - 2], path[i - 1]);

					if (eq(before, step)) fail('pointless corner (a straight run split in two)');
					if (before.x === -step.x && before.y === -step.y) fail('doubles back');
				}

				if (!straightSnap) for (const bx of [source, target]) if (cuts(path[i - 1], path[i], bx)) fail('cuts through a node');
			}

			if (path.length - 2 > MAX_CORNERS) fail(`${path.length - 2} corners, more than ${MAX_CORNERS}`);
			if (JSON.stringify(routeEdge(from, to)) !== JSON.stringify(path)) fail('not deterministic');
		}
	}
}

const worst = Math.max(...cases.map((c) => c.path.length - 2));

console.log(`routed ${cases.length} cases (${SIDES.length * SIDES.length} side pairs × ${OFFSETS.length} positions, overlaps skipped); most corners: ${worst}`);
for (const p of problems.slice(0, 40)) console.log('  ✗', p);
if (problems.length > 40) console.log(`  … and ${problems.length - 40} more`);
console.log(problems.length ? `FAIL: ${problems.length} violations in ${cases.filter((c) => !c.ok).length} routes` : 'OK: every route valid');

// ── contact sheet ─────────────────────────────────────────────────────────────
const sheet = process.argv.indexOf('--sheet');

if (sheet > -1) {
	const out = process.argv[sheet + 1];
	const PANEL = 360;
	const SCALE = 0.19;
	const colors = ['#4fd1c5', '#f6ad55', '#b794f4', '#68d391', '#63b3ed', '#f687b3', '#faf089', '#a0aec0'];
	let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PANEL * 4}" height="${PANEL * 4}" font-family="monospace" font-size="11"><rect width="100%" height="100%" fill="#101010"/>`;

	SIDES.forEach((fromSide, row) => {
		SIDES.forEach((toSide, col) => {
			const ox = col * PANEL + PANEL / 2 - (W / 2) * SCALE;
			const oy = row * PANEL + PANEL / 2 - (H / 2) * SCALE;
			const tx = (x) => ox + x * SCALE;
			const ty = (y) => oy + y * SCALE;

			svg += `<rect x="${col * PANEL + 1}" y="${row * PANEL + 1}" width="${PANEL - 2}" height="${PANEL - 2}" fill="none" stroke="#2a2a2a"/>`;
			svg += `<text x="${col * PANEL + 8}" y="${row * PANEL + 16}" fill="#9a9a9a">${fromSide} → ${toSide}</text>`;
			svg += `<rect x="${tx(0)}" y="${ty(0)}" width="${W * SCALE}" height="${H * SCALE}" fill="#222" stroke="#666"/>`;

			cases
				.filter((c) => c.fromSide === fromSide && c.toSide === toSide && [-700, 0, 700].includes(c.dx) && [-420, 0, 420].includes(c.dy))
				.forEach((c, i) => {
					const color = c.ok ? colors[i % colors.length] : '#ff3030';

					svg += `<rect x="${tx(c.dx)}" y="${ty(c.dy)}" width="${W * SCALE}" height="${H * SCALE}" fill="none" stroke="${color}" stroke-opacity=".35"/>`;
					svg += `<polyline points="${c.path.map((p) => `${tx(p.x)},${ty(p.y)}`).join(' ')}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
					svg += `<circle cx="${tx(c.path.at(-1).x)}" cy="${ty(c.path.at(-1).y)}" r="2.5" fill="${color}"/>`;
				});
		});
	});

	writeFileSync(out, svg + '</svg>');
	console.log('contact sheet →', out);
}

process.exit(problems.length ? 1 : 0);
