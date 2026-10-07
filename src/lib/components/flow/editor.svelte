<!-- @component
The complete flow editor in one section: sidebar, top bar, tabs, canvas, automations, overview, settings and export. Takes no props and fills the viewport height; use `EditorApp` to supply your own avatar and card-texture images. 
@example
```svelte
<Editor />
```
-->

<script lang="ts">
	import './editor.css';
	import EditorApp from './editor-app.svelte';
</script>

<section id="editor" class="fs-relative fs-row fl-editor">
	<EditorApp
		avatarSrc="/assets/images/_common/avatar.svg"
		textureSrc="/assets/images/home/editor/overview/card-texture.avif"
	/>
</section>
