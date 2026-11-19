<script lang="ts">
	import { workspace } from './workspace.svelte';
	import { sidebar } from './sidebar.svelte';
	import { appMenu } from './AppMenu.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Workflow from '@lucide/svelte/icons/workflow';
	import Search from '@lucide/svelte/icons/search';
	import PanelLeft from '@lucide/svelte/icons/panel-left';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Settings from '@lucide/svelte/icons/settings';

	let { onsearch }: { onsearch: () => void } = $props();
</script>

<nav class="rail" aria-label="App">
	<button class="tool" title="New note (Ctrl+N)" aria-label="New note" onclick={() => void workspace.newNote('doc')}>
		<Plus size={16} />
	</button>
	<button class="tool" title="New mind map (Ctrl+Shift+M)" aria-label="New mind map" onclick={() => void workspace.newNote('mindmap')}>
		<Workflow size={16} />
	</button>
	<button class="tool" title="Find a note (Ctrl+P)" aria-label="Find a note" onclick={onsearch}>
		<Search size={16} />
	</button>
	<div class="rail-spacer"></div>
	<button class="tool" class:on={sidebar.open} title="Notes list" aria-label="Notes list" aria-pressed={sidebar.open} onclick={() => sidebar.toggle()}>
		<PanelLeft size={16} />
	</button>
	<button class="tool" title="Trash" aria-label="Trash" onclick={() => appMenu.trash?.()}>
		<Trash2 size={16} />
	</button>
	<button class="tool" title="Settings (Ctrl+,)" aria-label="Settings" onclick={() => appMenu.settings?.()}>
		<Settings size={16} />
	</button>
</nav>
