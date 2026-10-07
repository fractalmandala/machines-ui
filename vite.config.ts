import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import svg from '@poppanator/sveltekit-svg';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('./src/lib', import.meta.url));
const site = fileURLToPath(new URL('./src/site', import.meta.url));
export default defineConfig({
	resolve: {
		alias: {
			'$lib': root,
			'$site': site,
			'$components': `${root}/components`,
			'$stores': `${root}/stores`,
			'$data': `${root}/data`,
			'$utils': `${root}/utils`,
		}
	},
	plugins: [
		svg({ svgoOptions: false }),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(),
			extensions: ['.svelte', '.svx'],
			preprocess: [vitePreprocess(), mdsvex({ extensions: ['.svx'] })],
		})
	]
});
