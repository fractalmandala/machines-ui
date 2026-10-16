// pngjs ships no types; this is the part of its API docs-shots.ts uses.
declare module 'pngjs' {
	export class PNG {
		constructor(options: { width: number; height: number });
		width: number;
		height: number;
		data: Buffer;
		static sync: {
			read(buffer: Buffer): PNG;
			write(png: PNG): Buffer;
		};
	}
}
