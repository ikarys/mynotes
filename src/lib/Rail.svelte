<script lang="ts">
	import { workspace } from './workspace.svelte';
	import { sidebar } from './sidebar.svelte';
	import { appMenu } from './AppMenu.svelte';
	import FilePlus from '@lucide/svelte/icons/file-plus';
	import GitBranchPlus from '@lucide/svelte/icons/git-branch-plus';
	import Search from '@lucide/svelte/icons/search';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import Settings from '@lucide/svelte/icons/settings';

	let { onsearch }: { onsearch: () => void } = $props();
</script>

<nav class="rail" aria-label="App">
	<button class="tool" title="New note (Ctrl+N)" aria-label="New note" onclick={() => void workspace.newNote('doc')}>
		<FilePlus size={16} />
	</button>
	<button class="tool" title="New mind map (Ctrl+Shift+M)" aria-label="New mind map" onclick={() => void workspace.newNote('mindmap')}>
		<GitBranchPlus size={16} />
	</button>
	<button class="tool" title="Find a note (Ctrl+P)" aria-label="Find a note" onclick={onsearch}>
		<Search size={16} />
	</button>
	<div class="rail-spacer"></div>
	<button class="tool" class:on={sidebar.open} title="Notes list" aria-label="Notes list" aria-pressed={sidebar.open} onclick={() => sidebar.toggle()}>
		<PanelLeft size={16} />
	</button>
	<button class="tool" title="Trash" aria-label="Trash" onclick={() => appMenu.trash?.()}>
		<!-- Lucide has no wastebasket; drawn in its style so the bin reads differently from the delete action. -->
		<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
			<path d="M3 5h18" />
			<path d="M5 5l1.6 15.2A2 2 0 0 0 8.6 22h6.8a2 2 0 0 0 2-1.8L19 5" />
			<path d="M9.5 9l.5 9M14.5 9l-.5 9M12 9v9" />
		</svg>
	</button>
	<button class="tool" title="Settings (Ctrl+,)" aria-label="Settings" onclick={() => appMenu.settings?.()}>
		<Settings size={16} />
	</button>
</nav>
