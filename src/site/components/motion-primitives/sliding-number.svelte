<script lang="ts">
	import './sliding-number.css';
	import Number from './Number.svelte';

	let { value, place }: { value: number; place: number } = $props();
	let animatedValue = $state(value);

	$effect(() => {
		const target = value;
		let frame = 0;
		const start = animatedValue;
		const started = performance.now();
		const duration = 280;
		const tick = (now: number) => {
			const progress = Math.min(1, (now - started) / duration);
			const eased = 1 - Math.pow(1 - progress, 3);
			animatedValue = start + (target - start) * eased;
			if (progress < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div
	class="fs-relative fl-sliding-number"
>
	<div class="fl-sliding-number-div">0</div>
	{#each Array.from({ length: 10 }, (_, index) => index) as index (index)}
		<Number mv={{ get: () => animatedValue }} number={index} />
	{/each}
</div>
