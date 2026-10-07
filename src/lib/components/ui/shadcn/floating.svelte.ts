/**
 * FloatingUI-lite: shared viewport-relative floating math for the hand-rolled
 * families (Tooltip, DropdownMenu). Document-space coordinates are consumed
 * as `position:absolute; left/top` on the portal target.
 */

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Align = 'start' | 'center' | 'end';

export type Rect = {
	top: number;
	left: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

export type ComputePositionOptions = {
	triggerRect: Rect;
	contentWidth: number;
	contentHeight: number;
	side: Side;
	sideOffset: number;
	align: Align;
	alignOffset: number;
	avoidCollisions: boolean;
	collisionPadding: number;
	scrollX: number;
	scrollY: number;
	viewportWidth: number;
	viewportHeight: number;
};

export type ComputePositionResult = { x: number; y: number; side: Side };

/**
 * Returns document-space coordinates plus the placed side (after optional
 * flip + clamp).
 */
export function computeFloatingPosition(opts: ComputePositionOptions): ComputePositionResult {
	const {
		triggerRect: r,
		contentWidth: cw,
		contentHeight: ch,
		side: desiredSide,
		sideOffset,
		align,
		alignOffset,
		avoidCollisions,
		collisionPadding: pad,
		scrollX,
		scrollY,
		viewportWidth: vw,
		viewportHeight: vh
	} = opts;

	const mainFits = (side: Side) => {
		switch (side) {
			case 'top':
				return r.top - sideOffset - ch >= scrollY + pad;
			case 'bottom':
				return r.bottom + sideOffset + ch <= scrollY + vh - pad;
			case 'left':
				return r.left - sideOffset - cw >= scrollX + pad;
			case 'right':
				return r.right + sideOffset + cw <= scrollX + vw - pad;
		}
	};

	let side = desiredSide;
	if (avoidCollisions && !mainFits(desiredSide)) {
		const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[
			desiredSide
		] as Side;
		if (mainFits(opposite)) side = opposite;
	}

	const cross = (start: number, extent: number, contentExtent: number) => {
		let pos =
			align === 'start'
				? start
				: align === 'end'
					? start + extent - contentExtent
					: start + (extent - contentExtent) / 2;
		pos += alignOffset;
		return pos;
	};

	let x: number;
	let y: number;
	switch (side) {
		case 'top':
			x = cross(r.left, r.width, cw);
			y = r.top - sideOffset - ch;
			break;
		case 'bottom':
			x = cross(r.left, r.width, cw);
			y = r.bottom + sideOffset;
			break;
		case 'left':
			x = r.left - sideOffset - cw;
			y = cross(r.top, r.height, ch);
			break;
		case 'right':
			x = r.right + sideOffset;
			y = cross(r.top, r.height, ch);
			break;
	}

	// clamp the cross axis inside the viewport
	const minX = scrollX + pad;
	const maxX = scrollX + vw - cw - pad;
	const minY = scrollY + pad;
	const maxY = scrollY + vh - ch - pad;
	if (maxX >= minX) x = Math.min(Math.max(x, minX), maxX);
	if (maxY >= minY) y = Math.min(Math.max(y, minY), maxY);

	return { x, y, side };
}

/**
 * Wait until every CSS animation/transition running on `node` has finished.
 * Used to keep content mounted while its exit animation plays before
 * unmounting (bits-ui presence behavior). Hard timeout as a safety net.
 */
export async function waitForFloatingAnimations(
	node: HTMLElement,
	timeoutMs = 500
): Promise<void> {
	await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
	const animations = node.getAnimations({ subtree: false });
	if (!animations.length) return;
	await Promise.race([
		Promise.all(animations.map((animation) => animation.finished.catch(() => undefined))),
		new Promise((resolve) => setTimeout(resolve, timeoutMs))
	]);
}
