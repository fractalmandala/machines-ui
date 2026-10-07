<script lang="ts">

    import ColorPicker from './ColorPicker.svelte';
    import { ACCENT_EVENT, accents, DEFAULT_ACCENT_ID, setAccent } from '$lib/utils/accents.js'

    	let current = $state(DEFAULT_ACCENT_ID);
	let accentOpen = $state(false);
	let showPicker = $state(false);
	let dropdownEl: HTMLElement | undefined;
	let probeEl: HTMLElement | undefined;

	// Until a choice is made no accent is set on <html> and each graph falls back to
	// its built-in colour. Read that colour off a probe, as hex (the picker wants hex).
	function probeHex() {
		if (!probeEl) return DEFAULT_ACCENT_ID;

		const ctx = document.createElement('canvas').getContext('2d');

		if (!ctx) return DEFAULT_ACCENT_ID;

		ctx.fillStyle = getComputedStyle(probeEl).color;
		ctx.fillRect(0, 0, 1, 1);

		const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;

		return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
	}

	function toggleAccentDropdown() {
		accentOpen = !accentOpen;
		if (accentOpen) showPicker = false;
	}

	function closeAccentDropdown() {
		accentOpen = false;
		showPicker = false;
	}

	function onDocClick(e: MouseEvent) {
		if (!accentOpen) return;
		if (dropdownEl && !dropdownEl.contains(e.target as Node)) {
			closeAccentDropdown();
		}
	}

	// The trigger's dot shows the live accent: read it now, and again whenever it changes.
	$effect(() => {
		const sync = () => (current = document.documentElement.getAttribute('data-accent') ?? probeHex());

		sync();
		window.addEventListener(ACCENT_EVENT, sync);

		return () => window.removeEventListener(ACCENT_EVENT, sync);
	});

	$effect(() => {
		if (accentOpen) {
			document.addEventListener('click', onDocClick);
			return () => document.removeEventListener('click', onDocClick);
		}
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && accentOpen) closeAccentDropdown();
	}

</script>

			<div class="fs-relative" role="button" tabindex="0" bind:this={dropdownEl} onkeydown={onKeydown}>
				<span bind:this={probeEl} class="accent-probe" aria-hidden="true"></span>
				<button
					type="button"
					class="accent-trigger"
					aria-label="Accent color"
					aria-expanded={accentOpen}
					onclick={toggleAccentDropdown}
				>
					<span class="accent-preview" style:background={current}></span>
				</button>
				{#if accentOpen}
					<div class="accent-panel">
						{#if !showPicker}
							<div class="swatch-grid">
								{#each accents as accent (accent.id)}
									<button
										type="button"
										class="swatch-btn"
										class:selected={accent.id === current}
										style:--swatch={accent.accent}
										aria-label={accent.accent}
										onclick={(e) => {
											e.stopPropagation();
											setAccent(accent.accent);
											closeAccentDropdown();
										}}
									>
										<span class="swatch-dot"></span>
									</button>
								{/each}
							</div>
							<button
								type="button"
								class="custom-btn"
								onclick={(e) => {
									e.stopPropagation();
									showPicker = true;
								}}
							>
								<span class="custom-icon">+</span>
								<span>Custom color</span>
							</button>
						{:else}
							<ColorPicker value={current} />
							<button
								type="button"
								class="back-btn"
								onclick={(e) => {
									e.stopPropagation();
									showPicker = false;
								}}
							>
								← Back to presets
							</button>
						{/if}
					</div>
				{/if}
			</div>

<style>

	.accent-probe {
		position: absolute;
		width: 0;
		height: 0;
		color: var(--graph-accent, oklch(0.78 0.17 155));
	}

	.accent-preview {
		display: block;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		border: 2px solid var(--border, #333);
	}


	.accent-panel {
		position: absolute;
		top: calc(100% + 0.5rem);
		right: 0;
		width: 16rem;
		background: var(--bg-dialog, #1e1e1e);
		border: 1px solid var(--border, #333);
		border-radius: 0.75rem;
		box-shadow: 0 8px 32px rgba(0,0,0,0.4);
		z-index: 50;
		overflow: hidden;
	}

	.swatch-grid {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 0.25rem;
		padding: 0.6rem 0.6rem 0.4rem;
	}

	.swatch-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		aspect-ratio: 1;
		padding: 0;
		border: 0;
		border-radius: 0.375rem;
		background: transparent;
		cursor: pointer;
		position: relative;
	}

	.swatch-btn:hover {
		background: var(--bg-surface, #2a2a2a);
	}

	.swatch-btn.selected {
		background: var(--text-muted, #555);
	}

	.swatch-dot {
		display: block;
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 9999px;
		background: var(--swatch);
	}

	.custom-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: calc(100% - 1.2rem);
		margin: 0 0.6rem 0.5rem;
		padding: 0.4rem 0.6rem;
		border: 1px dashed var(--border, #444);
		border-radius: 0.5rem;
		background: transparent;
		color: var(--text-secondary, #999);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.custom-btn:hover {
		border-color: var(--text-muted, #666);
		color: var(--text-primary, #ddd);
	}

	.custom-icon {
		font-size: 1rem;
		line-height: 1;
	}

	.back-btn {
		display: block;
		width: calc(100% - 1.2rem);
		margin: 0 0.6rem 0.5rem;
		padding: 0.35rem 0.6rem;
		border: 0;
		border-radius: 0.375rem;
		background: var(--bg-surface, #2a2a2a);
		color: var(--text-secondary, #999);
		font-size: 0.75rem;
		cursor: pointer;
	}

	.back-btn:hover {
		color: var(--text-primary, #ddd);
	}


</style>