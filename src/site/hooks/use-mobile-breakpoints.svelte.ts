const BREAKPOINTS = {
	sm: 640,
	md: 768,
	lg: 1024
} as const;

export type MobileBreakpointState = {
	belowSm: boolean;
	belowMd: boolean;
	belowLg: boolean;
	width: number;
};

const SERVER_STATE: MobileBreakpointState = {
	belowSm: false,
	belowMd: false,
	belowLg: false,
	width: 0
};

export function useMobileBreakpoints(): MobileBreakpointState {
	let state = $state<MobileBreakpointState>(SERVER_STATE);

	$effect(() => {
		if (typeof window === 'undefined') return;

		const update = () => {
			const width = window.innerWidth;
			state = {
				belowSm: width < BREAKPOINTS.sm,
				belowMd: width < BREAKPOINTS.md,
				belowLg: width < BREAKPOINTS.lg,
				width
			};
		};

		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	});

	return {
		get belowSm() {
			return state.belowSm;
		},
		get belowMd() {
			return state.belowMd;
		},
		get belowLg() {
			return state.belowLg;
		},
		get width() {
			return state.width;
		}
	};
}

export function getBelowBreakpointClasses(state: MobileBreakpointState): string {
	const classes: string[] = [];
	if (state.belowLg) classes.push('below-lg');
	if (state.belowMd) classes.push('below-md');
	if (state.belowSm) classes.push('below-sm');
	return classes.join(' ');
}
