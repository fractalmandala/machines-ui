<!-- @component
The node canvas on its own: pan and zoom, drag to connect nodes, an actions panel to add steps, an inspector for the selected node, undo and redo. Takes no props; state lives in the exported `flow` store. Needs a container with an explicit height. 
@example
```svelte
<div class="canvas-host">
  <FlowCanvas />
</div>
```
-->

<script module lang="ts">
	import './flow-canvas.css';
	import { onMount, tick } from 'svelte';
	import { clsx } from 'clsx';
	import { ease } from '$lib/utils/easings.js';
	import { tween, type TweenHandle } from '$lib/utils/tween.js';
	import { useCompact } from '$lib/utils/use-compact.js';
	import { sideNormal } from '$lib/core/route.js';
	import {
		addNode,
		checkpoint,
		closeInspector,
		connect,
		moveNode,
		openInspector,
		redo,
		removeSelection,
		select,
		setSize,
		setView,
		undo,
		flow,
		type ActionKind,
		type PortId,
		type FlowNodeData as NodeData,
		type FlowView,
		DEFAULT_VIEW
	} from '$lib/stores/flow-store.svelte';
	import ActionsPanel from './actions-panel/actions-panel.svelte';
	import FlowItem from './flow-item.svelte';
	import FlowEdges, { portKey, type EdgePreview } from './flow-edges.svelte';
	import FlowControls from './flow-controls.svelte';
	import FlowGhost from './flow-ghost.svelte';
	import FlowGrid from './flow-grid.svelte';
	import NodePanel from './node-panel/node-panel.svelte';
	import { ACTIONS } from './flow-actions.js';
	import {
		MAX_ZOOM,
		MIN_ZOOM,
		NODE_WIDTH,
		clampZoom,
		estimateHeight,
		freePlacement,
		hasInput,
		inputAt,
		inputPoint,
		inputSide,
		nodeHeight,
		openPorts,
		oppositeSide,
		outputPoint,
		outputSide,
		portsOf,
		placementFor,
		snapToNodes,
		toWorld,
		zoomAround,
		type OpenPort,
		type Point
	} from './flow-geometry.js';

	type PaletteDrag = {
		kind: ActionKind;
		clientX: number;
		clientY: number;
		grabX: number;
		grabY: number;
		snap: OpenPort | null;
		placement: Point | null;
	};

	type LinkDrag = {
		source: string;
		port: PortId | null;
		pointer: Point;
		target: string | null;
	};

	type PointerEnd = (event: PointerEvent, cancelled: boolean) => void;

	const VIEW_DURATION = 0.25;

	const SNAP_RADIUS = 48;

	const DRAG_THRESHOLD = 4;

	const ZOOM_STEP = 1.25;

	const SNAP_TOLERANCE = 10;

	let handledFitRequest = 0;

	function trackPointer(onMove: (event: PointerEvent) => void, onEnd: PointerEnd) {
		const handleUp = (event: PointerEvent) => {
			stop();
			onEnd(event, false);
		};
		const handleCancel = (event: PointerEvent) => {
			stop();
			onEnd(event, true);
		};
		function stop() {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', handleUp);
			window.removeEventListener('pointercancel', handleCancel);
		}
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', handleUp);
		window.addEventListener('pointercancel', handleCancel);
		return stop;
	}

	function findSnap(world: Point, zoom: number) {
		const { nodes, edges, sizes } = flow;
		let best: {
			port: OpenPort;
			placement: Point;
		} | null = null;
		let bestDistance = Infinity;
		for (const port of openPorts(nodes, edges, sizes)) {
			const placement = placementFor(port.source, port.port, sizes);
			const distance = Math.hypot(world.x - port.point.x, world.y - port.point.y) * zoom;
			// the area a drop is welcome in: the new node's rectangle and the stub that leads to it
			const inside =
				world.x >= Math.min(placement.x, port.point.x - 12) &&
				world.x <= Math.max(placement.x + NODE_WIDTH, port.point.x + 12) &&
				world.y >= Math.min(placement.y, port.point.y - 12) &&
				world.y <= Math.max(placement.y + 121, port.point.y + 12);
			if ((distance <= SNAP_RADIUS || inside) && distance < bestDistance) {
				best = {
					port,
					placement: freePlacement(placement, nodes, sizes)
				};
				bestDistance = distance;
			}
		}
		return best;
	}

	function nodeAt(world: Point, exclude: string) {
		const { nodes, sizes } = flow;
		for (let index = nodes.length - 1; index >= 0; index--) {
			const node = nodes[index];
			if (node.id === exclude || !hasInput(node)) continue;
			const height = nodeHeight(node, sizes);
			if (
				world.x >= node.x &&
				world.x <= node.x + NODE_WIDTH &&
				world.y >= node.y - 16 &&
				world.y <= node.y + height
			)
				return node.id;
		}
		return null;
	}

	function resolvePort(link: LinkDrag): PortId {
		if (link.port) return link.port;
		const source = flow.nodes.find((node) => node.id === link.source);
		if (!source) return 'out';
		const ports = portsOf(source);
		if (!(ports.includes('true') && ports.includes('false'))) return ports[0] ?? 'out';
		// a branch takes the port on the side of the pointer, along the edge the ports leave from
		const normal = sideNormal(outputSide(source, 'true'));
		const anchor = outputPoint(source, flow.sizes, 'true');
		const along = (link.pointer.x - anchor.x) * normal.y - (link.pointer.y - anchor.y) * normal.x;
		return along < 0 ? 'true' : 'false';
	}
</script>

<script lang="ts">
	let containerRef = $state<HTMLDivElement | null>(null);

	let panelRef = $state<HTMLElement | null>(null);

	let stopTrackingRef: (() => void) | null = null;

	let animationRef: TweenHandle | null = null;

	const nodes = $derived(flow.nodes);

	const edges = $derived(flow.edges);

	const sizes = $derived(flow.sizes);

	const selection = $derived(flow.selection);

	const view = $derived(flow.view);

	const run = $derived(flow.run);

	const inspectorNodeId = $derived(flow.inspector?.nodeId ?? null);

	const compact = useCompact();

	let panelOverride = $state<boolean | null>(null);

	let panelOpen = $derived(panelOverride ?? !compact.matches);

	// the canvas on its own: both sidebars folded away. The expand button on the canvas toggles it.
	let focused = $state(false);

	function toggleFocus() {
		focused = !focused;
		// the canvas changes width: wait for the layout, then fit the flow to it
		tick().then(() => fitView());
	}

	let palette = $state<PaletteDrag | null>(null);

	let link = $state<LinkDrag | null>(null);

	let draggingNode = $state<string | null>(null);

	let panning = $state(false);

	function bounds() {
		return containerRef!.getBoundingClientRect();
	}

	function track(onMove: (event: PointerEvent) => void, onEnd: PointerEnd) {
		stopTrackingRef?.();
		stopTrackingRef = trackPointer(onMove, (event, cancelled) => {
			stopTrackingRef = null;
			onEnd(event, cancelled);
		});
	}

	function stopAnimation() {
		animationRef?.cancel();
		animationRef = null;
	}

	function animateView(update: (view: FlowView) => FlowView) {
		stopAnimation();
		const from = flow.view;
		const to = update(from);
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			setView(() => to);
			return;
		}
		animationRef = tween(0, 1, {
			duration: VIEW_DURATION,
			ease: ease.power3InOut,
			onUpdate: (progress) =>
				setView(() => ({
					x: from.x + (to.x - from.x) * progress,
					y: from.y + (to.y - from.y) * progress,
					zoom: from.zoom + (to.zoom - from.zoom) * progress
				})),
			onComplete: () => {
				animationRef = null;
			}
		});
	}

	function cancelInteraction() {
		stopTrackingRef?.();
		stopTrackingRef = null;
		palette = null;
		link = null;
		draggingNode = null;
		panning = false;
	}

	onMount(() => () => {
		stopTrackingRef?.();
		animationRef?.cancel();
	});

	function reveal(node: NodeData) {
		const rect = bounds();
		const current = flow.view;
		const height = estimateHeight(node);
		const inset = 16;
		const right = 16;
		const left = rect.width / 2 + current.x + node.x * current.zoom;
		const top = current.y + node.y * current.zoom;
		const visible =
			left >= inset &&
			left + NODE_WIDTH * current.zoom <= rect.width - right &&
			top >= 16 &&
			top + height * current.zoom <= rect.height - 16;
		if (visible) return;
		const centerX = inset + (rect.width - inset - right) / 2;
		animateView((value) => ({
			...value,
			x: centerX - rect.width / 2 - (node.x + NODE_WIDTH / 2) * value.zoom,
			y: rect.height / 2 - (node.y + height / 2) * value.zoom
		}));
	}

	function createNode(
		kind: ActionKind,
		position: Point,
		source: {
			source: string;
			port: PortId;
		} | null
	) {
		const action = ACTIONS[kind];
		const origin = source ? flow.nodes.find((node) => node.id === source.source) : undefined;
		// a node added from a port faces back at it; the default top input needs no field
		const facing = origin ? oppositeSide(outputSide(origin, source!.port)) : 'top';
		const node: NodeData = {
			id: crypto.randomUUID(),
			kind,
			x: Math.round(position.x),
			y: Math.round(position.y),
			title: action.title,
			description: action.description,
			fresh: true,
			...(facing === 'top' ? {} : { input: facing })
		};
		addNode(node, source);
		return node;
	}

	function addToNextSlot(kind: ActionKind) {
		const state = flow;
		const ports = openPorts(state.nodes, state.edges, state.sizes);
		const preferred =
			ports.find(
				(port) => state.selection?.type === 'node' && port.source.id === state.selection.id
			) ?? ports[0];
		if (preferred) {
			const node = createNode(
				kind,
				freePlacement(
					placementFor(preferred.source, preferred.port, state.sizes),
					state.nodes,
					state.sizes
				),
				{
					source: preferred.source.id,
					port: preferred.port
				}
			);
			reveal(node);
			return;
		}
		const rect = bounds();
		const center = toWorld(
			rect.left + rect.width / 2,
			rect.top + rect.height / 3,
			rect,
			state.view
		);
		const node = createNode(
			kind,
			freePlacement(
				{
					x: center.x - NODE_WIDTH / 2,
					y: center.y
				},
				state.nodes,
				state.sizes
			),
			null
		);
		reveal(node);
	}

	function resolvePalette(
		kind: ActionKind,
		clientX: number,
		clientY: number,
		grabX: number,
		grabY: number
	): PaletteDrag {
		const base = {
			kind,
			clientX,
			clientY,
			grabX,
			grabY,
			snap: null,
			placement: null
		};
		const rect = bounds();
		const panel = panelRef?.getBoundingClientRect();
		const overPanel =
			panel &&
			clientX >= panel.left &&
			clientX <= panel.right &&
			clientY >= panel.top &&
			clientY <= panel.bottom;
		const inside =
			clientX >= rect.left &&
			clientX <= rect.right &&
			clientY >= rect.top &&
			clientY <= rect.bottom;
		if (overPanel || !inside) return base;
		const current = flow.view;
		const world = toWorld(clientX, clientY, rect, current);
		const snap = findSnap(world, current.zoom);
		if (snap)
			return {
				...base,
				snap: snap.port,
				placement: snap.placement
			};
		return {
			...base,
			placement: {
				x: world.x - NODE_WIDTH / 2,
				y: world.y - 18
			}
		};
	}

	function handleItemPointerDown(kind: ActionKind, event: PointerEvent) {
		if (event.button !== 0) return;
		const item = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
		if (!item) return;
		const grabX = event.clientX - item.left;
		const grabY = event.clientY - item.top;
		const startX = event.clientX;
		const startY = event.clientY;
		let active = false;
		track(
			(move) => {
				if (!active && Math.hypot(move.clientX - startX, move.clientY - startY) < DRAG_THRESHOLD)
					return;
				active = true;
				palette = resolvePalette(kind, move.clientX, move.clientY, grabX, grabY);
			},
			(end, cancelled) => {
				palette = null;
				if (cancelled) return;
				if (!active) {
					addToNextSlot(kind);
					return;
				}
				const drop = resolvePalette(kind, end.clientX, end.clientY, grabX, grabY);
				if (!drop.placement) return;
				createNode(
					kind,
					drop.placement,
					drop.snap
						? {
								source: drop.snap.source.id,
								port: drop.snap.port
							}
						: null
				);
			}
		);
	}

	function handleNodePointerDown(id: string, event: PointerEvent) {
		if (event.button !== 0) return;
		event.stopPropagation();
		const state = flow;
		select({
			type: 'node',
			id
		});
		const node = state.nodes.find((item) => item.id === id);
		if (!node) return;
		const zoom = state.view.zoom;
		const startX = event.clientX;
		const startY = event.clientY;
		// Capture primitives: `node` is a $state proxy that moveNode mutates in place,
		// so re-reading node.x/node.y inside the move handler would compound deltas.
		const startNodeX = node.x;
		const startNodeY = node.y;
		let active = false;
		track(
			(move) => {
				const deltaX = move.clientX - startX;
				const deltaY = move.clientY - startY;
				if (!active) {
					if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
					active = true;
					checkpoint();
					draggingNode = id;
				}
				const current = flow;
				const moving = {
					x: startNodeX + deltaX / zoom,
					y: startNodeY + deltaY / zoom,
					width: NODE_WIDTH,
					height: nodeHeight(node, current.sizes)
				};
				const others = current.nodes
					.filter((item) => item.id !== id)
					.map((item) => ({
						x: item.x,
						y: item.y,
						width: NODE_WIDTH,
						height: nodeHeight(item, current.sizes)
					}));
				const snapped = snapToNodes(moving, others, SNAP_TOLERANCE / zoom);
				moveNode(id, Math.round(snapped.x), Math.round(snapped.y));
			},
			() => (draggingNode = null)
		);
	}

	function startLink(source: string, port: PortId | null, event: PointerEvent) {
		if (event.button !== 0) return;
		event.stopPropagation();
		const measure = (clientX: number, clientY: number): LinkDrag => {
			const pointer = toWorld(clientX, clientY, bounds(), flow.view);
			return {
				source,
				port,
				pointer,
				target: nodeAt(pointer, source)
			};
		};
		link = measure(event.clientX, event.clientY);
		track(
			(move) => (link = measure(move.clientX, move.clientY)),
			(end, cancelled) => {
				link = null;
				if (cancelled) return;
				const result = measure(end.clientX, end.clientY);
				if (!result.target) return;
				connect(source, resolvePort(result), result.target);
			}
		);
	}

	function handleHandlePointerDown(id: string, event: PointerEvent, port?: PortId) {
		return startLink(id, port ?? null, event);
	}

	function handleEndpointPointerDown(source: string, port: PortId, event: PointerEvent) {
		return startLink(source, port, event);
	}

	function handleEdgePointerDown(id: string, event: PointerEvent) {
		if (event.button !== 0) return;
		event.stopPropagation();
		select({
			type: 'edge',
			id
		});
	}

	const handleCanvasPointerDown = (event: PointerEvent) => {
		if (event.button !== 0 && event.button !== 1) return;
		stopAnimation();
		const start = flow.view;
		const startX = event.clientX;
		const startY = event.clientY;
		let active = false;
		track(
			(move) => {
				const deltaX = move.clientX - startX;
				const deltaY = move.clientY - startY;
				if (!active) {
					if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
					active = true;
					panning = true;
				}
				setView(() => ({
					...start,
					x: start.x + deltaX,
					y: start.y + deltaY
				}));
			},
			() => {
				panning = false;
				if (!active) select(null);
			}
		);
	};

	$effect(() => {
		const element = containerRef;
		if (!element) return;
		const handleWheel = (event: WheelEvent) => {
			if (event.target instanceof Element && event.target.closest('[data-canvas-overlay]')) return;
			event.preventDefault();
			stopAnimation();
			const scale = event.deltaMode === 1 ? 16 : 1;
			const rect = element.getBoundingClientRect();
			if (event.ctrlKey || event.metaKey) {
				const factor = Math.exp(-event.deltaY * scale * 0.01);
				setView((current) =>
					zoomAround(
						current,
						current.zoom * factor,
						event.clientX - rect.left,
						event.clientY - rect.top,
						rect.width
					)
				);
				return;
			}
			setView((current) => ({
				...current,
				x: current.x - event.deltaX * scale,
				y: current.y - event.deltaY * scale
			}));
		};
		element.addEventListener('wheel', handleWheel, {
			passive: false
		});
		return () => element.removeEventListener('wheel', handleWheel);
	});

	$effect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const target = event.target;
			if (
				target instanceof Element &&
				target.closest("input, textarea, select, [contenteditable='true']")
			)
				return;
			const state = flow;
			const key = event.key.toLowerCase();
			if ((event.metaKey || event.ctrlKey) && (key === 'z' || key === 'y')) {
				event.preventDefault();
				if (key === 'y' || event.shiftKey) redo();
				else undo();
				return;
			}
			if ((key === 'delete' || key === 'backspace') && state.selection) {
				event.preventDefault();
				removeSelection();
				return;
			}
			if (key === 'escape') {
				cancelInteraction();
				select(null);
			}
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	});

	const zoomBy = (factor: number) => {
		const rect = bounds();
		animateView((current) =>
			zoomAround(current, current.zoom * factor, rect.width / 2, rect.height / 2, rect.width)
		);
	};

	function fitView(
		options: {
			animate?: boolean;
			onlyIfNeeded?: boolean;
		} = {}
	) {
		const state = flow;
		if (!state.nodes.length) return;
		const rect = bounds();
		const minX = Math.min(...state.nodes.map((node) => node.x)) - 40;
		const maxX = Math.max(...state.nodes.map((node) => node.x + NODE_WIDTH)) + 40;
		const minY = Math.min(...state.nodes.map((node) => node.y)) - 24;
		const maxY =
			Math.max(...state.nodes.map((node) => node.y + nodeHeight(node, state.sizes))) + 104;
		const inset = 0;
		const zoom = clampZoom(
			Math.min((rect.width - inset - 64) / (maxX - minX), (rect.height - 64) / (maxY - minY))
		);
		const centerX = inset + (rect.width - inset) / 2;
		const fits = maxX - minX <= rect.width - inset - 64 && maxY - minY <= rect.height - 64;
		if (options.onlyIfNeeded && fits) {
			setView(() => DEFAULT_VIEW);
			return;
		}
		const target = {
			zoom,
			x: centerX - rect.width / 2 - ((minX + maxX) / 2) * zoom,
			y: fits ? DEFAULT_VIEW.y : rect.height / 2 - ((minY + maxY) / 2) * zoom
		};
		if (options.animate === false) setView(() => target);
		else animateView(() => target);
	}

	let fittedCompact = false;

	$effect(() => {
		if (!compact.matches || fittedCompact) return;
		fittedCompact = true;
		const frame = requestAnimationFrame(() =>
			fitView({
				animate: false
			})
		);
		return () => cancelAnimationFrame(frame);
	});

	const fitRequest = $derived(flow.fitRequest);

	$effect(() => {
		if (handledFitRequest === fitRequest) return;
		handledFitRequest = fitRequest;
		fitView({
			animate: false,
			onlyIfNeeded: true
		});
	});

	function appendTo(sourceId: string, kind: ActionKind) {
		const state = flow;
		const source = state.nodes.find((node) => node.id === sourceId);
		if (!source) return;
		const port =
			openPorts(state.nodes, state.edges, state.sizes).find((item) => item.source.id === sourceId)
				?.port ?? (source.kind === 'branch' ? 'true' : 'out');
		const node = createNode(
			kind,
			freePlacement(placementFor(source, port, state.sizes), state.nodes, state.sizes),
			{
				source: sourceId,
				port
			}
		);
		openInspector(node.id, 'build');
		reveal(node);
	}

	function focusNode(id: string) {
		const node = flow.nodes.find((item) => item.id === id);
		if (node) reveal(node);
	}

	const command = $derived(flow.command);

	let handledCommand = $state(0);

	$effect(() => {
		if (!command || handledCommand === command.nonce) return;
		handledCommand = command.nonce;
		if (command.type === 'fit') fitView();
		if (command.type === 'reset') {
			const rect = bounds();
			animateView((current) => zoomAround(current, 1, rect.width / 2, rect.height / 3, rect.width));
		}
		if (command.type === 'focus' && command.nodeId) focusNode(command.nodeId);
	});

	function openNode(id: string) {
		openInspector(id);
		focusNode(id);
	}

	let snapKey = $derived(palette?.snap ? portKey(palette.snap.source.id, palette.snap.port) : null);

	let preview: EdgePreview | null = $derived.by(() => {
		let preview: EdgePreview | null = null;
		const currentLink = link;
		if (currentLink && linkSource) {
			const targetId = currentLink.target;
			const target = targetId ? nodes.find((node) => node.id === targetId) : undefined;
			const fromSide = outputSide(linkSource, resolvePort(currentLink));
			preview = {
				from: outputPoint(linkSource, sizes, resolvePort(currentLink)),
				fromSide,
				to: target ? inputPoint(target, sizes) : currentLink.pointer,
				toSide: target ? inputSide(target) || 'top' : oppositeSide(fromSide),
				fromColor: ACTIONS[linkSource.kind].accent,
				toColor: target ? ACTIONS[target.kind].accent : '#ffffff'
			};
		} else if (palette?.snap && palette.placement) {
			const source = palette.snap.source;
			const fromSide = outputSide(source, palette.snap.port);
			const toSide = oppositeSide(fromSide);
			preview = {
				from: outputPoint(source, sizes, palette.snap.port),
				fromSide,
				to: inputAt(palette.placement, toSide),
				toSide,
				fromColor: ACTIONS[source.kind].accent,
				toColor: ACTIONS[palette.kind].accent
			};
		}
		return preview;
	});

	let linkSource = $derived.by(() => {
		const sourceId = link?.source;
		return sourceId ? nodes.find((node) => node.id === sourceId) : null;
	});

	let canvasStyle = $derived(
		`--view-x:${view.x}px;--view-y:${view.y}px;--view-zoom:${view.zoom};`
	);

	let interacting = $derived(Boolean(palette || link || draggingNode || panning));
</script>

<div
	class="fs-relative fs-minh0 fs-grow fs-canvas-wrapper"
	data-focus={focused || undefined}
>
	<aside class="canvas-left">
			<ActionsPanel
		bind:ref={panelRef}
		open={panelOpen}
		draggingKind={palette?.kind ?? null}
		onToggle={() => (panelOverride = !panelOpen)}
		onItemPointerDown={handleItemPointerDown}
		onAdd={addToNextSlot}
	/>
	</aside>
	<div class="fs-flow-canvas canvas-central fs-relative" bind:this={containerRef} role="application" aria-roledescription="flow canvas" aria-label="Flow canvas" style={canvasStyle} onpointerdown={handleCanvasPointerDown}>
			<FlowGrid />
	<div
		class="fs-absolute fs-flow-canvas-div"
	>
		<FlowEdges
			{nodes}
			{edges}
			{sizes}
			{selection}
			{snapKey}
			{preview}
			activeEdgeId={run.activeEdgeId}
			traversed={run.traversed}
			onEdgePointerDown={handleEdgePointerDown}
			onEndpointPointerDown={handleEndpointPointerDown}
			onDeleteEdge={removeSelection}
		/>
		{#if palette?.snap && palette.placement}
			<div
				aria-hidden="true"
				style="--node-x: {`${palette.placement.x}px`}; --node-y: {`${palette.placement.y}px`}"
				class={clsx(
					ACTIONS[palette.kind].theme,
					'fs-absolute fl-flow-canvas-div-2'
				)}
			></div>
		{/if}
		{#each nodes as node (node.id)}
			<FlowItem
				{node}
				selected={selection?.type === 'node' && selection.id === node.id}
				targeted={link?.target === node.id}
				dragging={draggingNode === node.id}
				runState={run.activeNodeId === node.id
					? 'active'
					: run.visited.includes(node.id)
						? 'done'
						: 'idle'}
				onMeasure={setSize}
				onNodePointerDown={handleNodePointerDown}
				onHandlePointerDown={handleHandlePointerDown}
				onOpen={openNode}
				editing={inspectorNodeId === node.id}
			/>
		{/each}
	</div>
	<FlowControls
		canZoomIn={view.zoom < MAX_ZOOM - 0.001}
		canZoomOut={view.zoom > MIN_ZOOM + 0.001}
		onZoomIn={() => zoomBy(ZOOM_STEP)}
		onZoomOut={() => zoomBy(1 / ZOOM_STEP)}
		{focused}
		onToggleFocus={toggleFocus}
	/>
	</div>
	<aside class="canvas-right">
			<NodePanel onFocusNode={focusNode} onAppend={appendTo} />
	</aside>
	{#if interacting}
		<div
			aria-hidden="true"
			class={clsx('fs-fixed fs-flow-canvas-div-3', link ? 'fs-flow-canvas-div-3-1' : 'fs-flow-canvas-div-3-2')}
		></div>
	{/if}
	{#if palette}
		<FlowGhost
			kind={palette.kind}
			x={palette.clientX - palette.grabX}
			y={palette.clientY - palette.grabY}
			snapped={Boolean(palette.snap)}
		/>
	{/if}
</div>
