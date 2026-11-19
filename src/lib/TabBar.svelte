<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import Workflow from '@lucide/svelte/icons/workflow';
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { workspace } from './workspace.svelte';
	import KindIcon from './KindIcon.svelte';
	import AppMenu from './AppMenu.svelte';
	import WindowControls from './WindowControls.svelte';

	let { onsearch }: { onsearch: () => void } = $props();

	let tabRefs = new Map<number, HTMLDivElement>();

	function trackTab(node: HTMLDivElement, id: number) {
		tabRefs.set(id, node);
		return {
			destroy() {
				if (tabRefs.get(id) === node) tabRefs.delete(id);
			}
		};
	}

	let drag: { id: number; startX: number } | null = null;
	let draggingId = $state<number | null>(null);

	// Window listeners, not pointer capture: reordering moves the tab node in the
	// DOM, and a detached node loses its capture.
	function startDrag(event: PointerEvent, id: number) {
		if (event.button !== 0) return;
		drag = { id, startX: event.clientX };
		window.addEventListener('pointermove', moveDrag);
		window.addEventListener('pointerup', endDrag);
		window.addEventListener('pointercancel', endDrag);
	}

	function moveDrag(event: PointerEvent) {
		if (!drag) return;
		if (draggingId === null) {
			if (Math.abs(event.clientX - drag.startX) < 4) return;
			draggingId = drag.id;
		}
		const index = workspace.tabs.findIndex((tab) => tab.id === drag?.id);
		const crossed = (neighbour: number, after: boolean) => {
			const tab = workspace.tabs[neighbour];
			const rect = tab && tabRefs.get(tab.id)?.getBoundingClientRect();
			if (!rect) return false;
			const middle = rect.left + rect.width / 2;
			return after ? event.clientX > middle : event.clientX < middle;
		};
		if (crossed(index + 1, true)) workspace.moveTab(drag.id, index + 1);
		else if (crossed(index - 1, false)) workspace.moveTab(drag.id, index - 1);
	}

	function endDrag() {
		drag = null;
		draggingId = null;
		window.removeEventListener('pointermove', moveDrag);
		window.removeEventListener('pointerup', endDrag);
		window.removeEventListener('pointercancel', endDrag);
	}

	$effect(() => {
		const id = workspace.active?.id;
		if (id == null) return;
		const el = tabRefs.get(id);
		if (!el) return;
		const frame = requestAnimationFrame(() => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
		return () => cancelAnimationFrame(frame);
	});
</script>

<!-- The bar doubles as the title bar: bare areas carry the drag region. -->
<nav class="tabbar" data-tauri-drag-region>
	<div class="tabs" role="tablist" data-tauri-drag-region>
		{#each workspace.tabs as tab (tab.id)}
			<div
				class="tab"
				class:dragging={tab.id === draggingId}
				role="tab"
				aria-selected={tab.id === workspace.activeId}
				tabindex={tab.id === workspace.activeId ? 0 : -1}
				use:trackTab={tab.id}
				onpointerdown={(e) => startDrag(e, tab.id)}
				onmousedown={(e) => {
					if (e.button === 0) workspace.activate(tab.id);
				}}
				onauxclick={(e) => {
					if (e.button === 1) {
						e.preventDefault();
						void workspace.close(tab.id);
					}
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						workspace.activate(tab.id);
					}
				}}
			>
				<KindIcon kind={tab.kind} size={14} />
				<span class="title" class:muted={!tab.title}>{tab.title || 'Untitled'}</span>
				<button
					class="close"
					aria-label="Close tab"
					title="Close (Ctrl+W)"
					onpointerdown={(e) => e.stopPropagation()}
					onmousedown={(e) => e.stopPropagation()}
					onclick={() => void workspace.close(tab.id)}
				>
					<X size={14} />
				</button>
			</div>
		{/each}
		<button class="tool" title="New note (Ctrl+N)" aria-label="New note" onclick={() => void workspace.newNote('doc')}>
			<Plus size={16} />
		</button>
		<button
			class="tool"
			title="New mind map (Ctrl+Shift+M)"
			aria-label="New mind map"
			onclick={() => void workspace.newNote('mindmap')}
		>
			<Workflow size={16} />
		</button>
	</div>

	<button class="search" onclick={onsearch} aria-label="Find a note" title="Find a note (Ctrl+P)">
		<Search size={14} />
		<span>Find a note</span>
		<kbd>Ctrl+P</kbd>
	</button>
	<AppMenu />
	<WindowControls />
</nav>
