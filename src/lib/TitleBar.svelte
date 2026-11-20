<script lang="ts">
	import { workspace } from './workspace.svelte';
	import KindIcon from './KindIcon.svelte';
	import AppMenu from './AppMenu.svelte';
	import WindowControls from './WindowControls.svelte';
</script>

<!-- Bare areas carry the drag region, so the bar moves the window. -->
<header class="titlebar" data-tauri-drag-region>
	{#if workspace.active}
		<span class="titlebar-note" data-tauri-drag-region>
			<KindIcon kind={workspace.active.kind} size={14} />
			<span class="titlebar-title" class:muted={!workspace.active.title} data-tauri-drag-region>{workspace.active.title || 'Untitled'}</span>
		</span>
	{/if}
	<AppMenu />
	<WindowControls />
</header>
