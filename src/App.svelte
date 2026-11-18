<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { appReady } from './lib/api';
	import { workspace } from './lib/workspace.svelte';
	import TabBar from './lib/TabBar.svelte';
	import QuickSwitcher from './lib/QuickSwitcher.svelte';
	import DocEditor from './lib/DocEditor.svelte';
	import MindMapEditor from './lib/MindMapEditor.svelte';
	import Toast from './lib/Toast.svelte';
	import Plus from '@lucide/svelte/icons/plus';
	import Workflow from '@lucide/svelte/icons/workflow';
	import './lib/theme.svelte';

	let switcherOpen = $state(false);
	let active = $derived(workspace.active);

	function onKeydown(e: KeyboardEvent): void {
		if (!e.ctrlKey) return;

		const key = e.key.toLowerCase();

		if (key === 'n' && !e.shiftKey && !e.altKey) {
			if (e.repeat) return;
			e.preventDefault();
			void workspace.newNote('doc');
		} else if (e.code === 'KeyM' && e.shiftKey && !e.altKey) {
			if (e.repeat) return;
			e.preventDefault();
			void workspace.newNote('mindmap');
		} else if (key === 'w' && !e.shiftKey && !e.altKey) {
			if (e.repeat) return;
			e.preventDefault();
			if (workspace.activeId !== null) void workspace.close(workspace.activeId);
		} else if (key === 'tab') {
			e.preventDefault();
			workspace.cycle(e.shiftKey ? -1 : 1);
		} else if (key === 'p' && !e.shiftKey && !e.altKey) {
			e.preventDefault();
			switcherOpen = !switcherOpen;
		}
	}

	onMount(async () => {
		window.addEventListener('keydown', onKeydown, true);

		try {
			await workspace.restore();
		} catch (err) {
			console.error(err);
		}

		requestAnimationFrame(() => {
			appReady().catch((err) => console.error(err));
		});
	});

	onDestroy(() => {
		window.removeEventListener('keydown', onKeydown, true);
	});
</script>

<TabBar onsearch={() => (switcherOpen = true)} />

<main class="pane">
	{#if active?.kind === 'doc'}
		{#key active.id}
			<DocEditor id={active.id} />
		{/key}
	{:else if active?.kind === 'mindmap'}
		{#key active.id}
			<MindMapEditor id={active.id} />
		{/key}
	{:else}
		<div class="empty-state">
			<div class="empty-title">No note open</div>
			<div class="empty-actions">
				<button class="empty-button" onclick={() => void workspace.newNote('doc')}>
					<Plus size={16} />
					New note
				</button>
				<button class="empty-button" onclick={() => void workspace.newNote('mindmap')}>
					<Workflow size={16} />
					New mind map
				</button>
			</div>
			<div class="shortcuts">
				<kbd>Ctrl+N</kbd>
				<kbd>Ctrl+Shift+M</kbd>
				<kbd>Ctrl+P</kbd>
			</div>
		</div>
	{/if}
</main>

<QuickSwitcher bind:open={switcherOpen} />
<Toast />
