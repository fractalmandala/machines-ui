<script lang="ts">
	import './Count.css';
	let { value }: { value: number } = $props();
</script>

<span class="fl-count">
	<span class="fs-text-white fl-count-span">{value}</span>
	<span class="fs-weight-400 fl-count-span-2">runs</span>
</span>
