<script lang="ts">
	import { version } from '../../package.json';
	import AppMenu from './AppMenu.svelte';
	import WindowControls from './WindowControls.svelte';
</script>

<!-- Bare areas carry the drag region, so the bar moves the window. -->
<header class="titlebar" data-tauri-drag-region>
	<span class="titlebar-app" data-tauri-drag-region>
		<img src="/favicon.png" alt="" width="18" height="18" draggable="false" />
		mynotes - {version}
	</span>
	<AppMenu />
	<WindowControls />
</header>
