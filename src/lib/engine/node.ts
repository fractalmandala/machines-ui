// Node-only: runs kept in a JSON file. Import from '@fractaldesign/machines-ui/engine/node'.
import type { RunRecord, RunStore } from './run-types.js';

const newest = (a: RunRecord, b: RunRecord) => b.startedAt - a.startedAt;

/** Runs kept in one JSON file at `path`. Each write replaces the file whole, so keep `keepRuns` small. */
export function fileRunStore(path: string): RunStore {
	const read = async (): Promise<RunRecord[]> => {
		const { readFile } = await import('node:fs/promises');

		try { return JSON.parse(await readFile(path, 'utf8')) as RunRecord[]; } catch { return []; }
	};

	const write = async (runs: RunRecord[]) => {
		const { writeFile, rename } = await import('node:fs/promises');

		await writeFile(`${path}.tmp`, JSON.stringify(runs));
		await rename(`${path}.tmp`, path);
	};

	return {
		async list(flowId) { return (await read()).filter((r) => !flowId || r.flowId === flowId).sort(newest); },
		async get(id) { return (await read()).find((r) => r.id === id); },
		async put(record) { await write([...(await read()).filter((r) => r.id !== record.id), record]); },
		async delete(id) { await write((await read()).filter((r) => r.id !== id)); },
		async prune(keep) { await write((await read()).sort(newest).slice(0, keep)); }
	};
}
