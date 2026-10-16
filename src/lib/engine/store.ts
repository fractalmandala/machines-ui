import type { RunRecord, RunStore } from './run-types.js';

const newest = (a: RunRecord, b: RunRecord) => b.startedAt - a.startedAt;

/** Runs kept in memory: gone when the page or process ends. The default. */
export function memoryRunStore(): RunStore {
	const runs = new Map<string, RunRecord>();

	return {
		async list(flowId) { return [...runs.values()].filter((r) => !flowId || r.flowId === flowId).sort(newest).map((r) => structuredClone(r)); },
		async get(id) { const r = runs.get(id); return r ? structuredClone(r) : undefined; },
		async put(record) { runs.set(record.id, structuredClone(record)); },
		async delete(id) { runs.delete(id); },
		async prune(keep) { for (const r of [...runs.values()].sort(newest).slice(keep)) runs.delete(r.id); }
	};
}

/**
 * Runs kept in the browser's IndexedDB: they survive a reload, and so does a run that is waiting for a person.
 * Throws if IndexedDB is not there; wrap it, or use `memoryRunStore`.
 */
export function indexedDbRunStore(name = 'machines-runs'): RunStore {
	const open = () =>
		new Promise<IDBDatabase>((resolve, reject) => {
			const request = indexedDB.open(name, 1);

			request.onupgradeneeded = () => request.result.createObjectStore('runs', { keyPath: 'id' });
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});

	const tx = async <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>) => {
		const db = await open();

		return new Promise<T>((resolve, reject) => {
			const request = work(db.transaction('runs', mode).objectStore('runs'));

			request.onsuccess = () => { db.close(); resolve(request.result); };
			request.onerror = () => { db.close(); reject(request.error); };
		});
	};

	const all = () => tx<RunRecord[]>('readonly', (s) => s.getAll() as IDBRequest<RunRecord[]>);

	return {
		async list(flowId) { return (await all()).filter((r) => !flowId || r.flowId === flowId).sort(newest); },
		async get(id) { return (await tx<RunRecord | undefined>('readonly', (s) => s.get(id) as IDBRequest<RunRecord | undefined>)) ?? undefined; },
		async put(record) { await tx('readwrite', (s) => s.put(JSON.parse(JSON.stringify(record)))); },
		async delete(id) { await tx('readwrite', (s) => s.delete(id)); },
		async prune(keep) { for (const r of (await all()).sort(newest).slice(keep)) await tx('readwrite', (s) => s.delete(r.id)); }
	};
}
