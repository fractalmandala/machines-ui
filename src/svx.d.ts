// mdsvex: a .svx file is a Svelte component
declare module '*.svx' {
	import type { Component } from 'svelte';
	const component: Component;
	export default component;
}
