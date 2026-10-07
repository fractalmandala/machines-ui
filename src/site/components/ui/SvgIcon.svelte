<script lang="ts">
	let { src, className, ...props }: { src: string; className?: string } & Record<string, unknown> =
		$props();
</script>

<img src={src} class={className} {...props} />
