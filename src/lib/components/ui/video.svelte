<script module lang="ts">
	import './video.css';
	import { cn } from '$lib/utils/utils.js';

	interface VideoProps {
		src: string;
		mobileSrc?: string;
		className?: string;
		poster?: string;
		stillPoster?: string;
		onLoadStart?: () => void;
		onLoadedData?: () => void;
		onError?: () => void;
	}
</script>

<script lang="ts">
	let {
		src,
		mobileSrc,
		className,
		poster,
		stillPoster,
		onLoadStart,
		onLoadedData,
		onError,
		...props
	}: VideoProps = $props();

	let videoRef = $state<HTMLVideoElement | null>(null);

	let isLowPowerMode = $state(false);

	function clearAllVideoSources(video: HTMLVideoElement) {
		// Remove src attribute from video element
		video.removeAttribute('src'); // Clear all source elements
		const sources = video.querySelectorAll('source');
		sources.forEach((source) => {
			source.removeAttribute('src');
		}); // Trigger load to release resources
		video.load();
	}

	function restoreVideoSources(video: HTMLVideoElement) {
		if (!video.dataset.originalSources) return;
		const sourcesData = JSON.parse(video.dataset.originalSources);
		const sources = video.querySelectorAll('source');
		sources.forEach((source, index) => {
			if (sourcesData[index]) {
				source.src = sourcesData[index].src;
				source.type = sourcesData[index].type;
				if (sourcesData[index].media) {
					source.media = sourcesData[index].media;
				}
			}
		}); // Reload the video with new sources
		video.load(); // Wait for the video to be ready before playing
		const onLoaded = () => {
			video.play().catch((err) => {
				console.log('Error playing video:', err); // If autoplay fails, remove the sources
				clearAllVideoSources(video);
			});
			video.removeEventListener('loadeddata', onLoaded);
		};
		video.addEventListener('loadeddata', onLoaded);
	}

	$effect(() => {
		const video = videoRef;
		if (!video) return;
		video.muted = true; // Store original sources for restoration
		if (!video.dataset.originalSources) {
			const sources = video.querySelectorAll('source');
			const sourcesData = Array.from(sources).map((source) => ({
				src: source.src,
				type: source.type,
				media: source.media || ''
			}));
			video.dataset.originalSources = JSON.stringify(sourcesData);
		} // Handle autoplay failure and detect low power mode
		const handleAutoplayFailure = () => {
			console.log('Autoplay failed, removing video sources');
			clearAllVideoSources(video);
		}; // Add event listener for autoplay failure
		video.addEventListener('error', handleAutoplayFailure); // Override play() to detect low power mode (NotAllowedError)
		const originalPlay = video.play;
		video.play = function () {
			return originalPlay.call(this).catch((error) => {
				// NotAllowedError indicates low power mode on iOS
				if (error instanceof Error && error.name === 'NotAllowedError') {
					console.log('Low Power Mode detected - showing poster image');
					isLowPowerMode = true;
					clearAllVideoSources(video);
				} else {
					console.log('Play promise rejected:', error);
					handleAutoplayFailure();
				} // Don't throw - prevent error bubbling
				return Promise.resolve();
			});
		}; // Also check on initial load when autoplay tries to play
		const checkInitialAutoplay = () => {
			if (video.readyState >= 2) {
				// Video is ready, try to detect low power mode
				const playPromise = video.play();
				if (playPromise !== undefined) {
					playPromise.catch((error) => {
						if (error instanceof Error && error.name === 'NotAllowedError') {
							console.log('Low Power Mode detected on initial load');
							isLowPowerMode = true;
							clearAllVideoSources(video);
						}
					});
				}
			}
		}; // Check after video can play
		const onCanPlay = () => {
			checkInitialAutoplay();
			video.removeEventListener('canplay', onCanPlay);
		};
		video.addEventListener('canplay', onCanPlay);
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					// Skip if low power mode is detected
					if (isLowPowerMode) return;
					if (entry.isIntersecting) {
						// Video is in view - restore sources and auto-play after load
						restoreVideoSources(video);
					} else {
						// Video is out of view - pause and clean sources
						video.pause();
						clearAllVideoSources(video);
					}
				});
			},
			{
				threshold: 0,
				rootMargin: '200px'
			}
		);
		observer.observe(video); // Cleanup observer on unmount
		return () => {
			observer.disconnect();
			video.removeEventListener('error', handleAutoplayFailure);
		};
	});
</script>

{#if isLowPowerMode && (stillPoster || poster)}
	<img
		src={stillPoster ?? poster!}
		alt=""
		width={0}
		height={0}
		sizes="100vw"
		class={cn('fl-video', className)}
		{...props}
	/>
{:else}
	<video
		bind:this={videoRef}
		autoplay
		loop
		muted
		playsInline
		preload="none"
		{poster}
		class={cn(
			'auto_video fl-video-video',
			className
		)}
		onloadstart={onLoadStart}
		onloadeddata={onLoadedData}
		onerror={onError}
		{...props}
	>
		<source {src} type="video/webm" media="(min-width: 768px)" />
		<source src={mobileSrc || src} type="video/webm" media="(max-width: 769px)" />Your browser does
		not support the video tag.
	</video>
{/if}
