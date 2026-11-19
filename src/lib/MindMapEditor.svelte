<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { loadNote, saveNote } from './api';
	import { createAutosave, type Autosave } from './autosave';
	import { workspace, type NoteActions } from './workspace.svelte';
	import { invoke } from '@tauri-apps/api/core';
	import type MindElixir from 'mind-elixir';
	import type { Theme } from 'mind-elixir';
	import Plus from '@lucide/svelte/icons/plus';
	import ListPlus from '@lucide/svelte/icons/list-plus';
	import Trash from '@lucide/svelte/icons/trash';
	import Undo from '@lucide/svelte/icons/undo-2';
	import Scan from '@lucide/svelte/icons/scan';
	import {
		isEmptyMindmap,
		mindmapMarkdown,
		mindmapText,
		mindmapTitle,
		parseMindmap
	} from './mindmap';

	let { id }: { id: number } = $props();

	let element: HTMLDivElement | undefined = $state();

	let mind: MindElixir | undefined;
	let ready = $state(false);
	let autosave: Autosave | undefined;
	let destroyed = false;

	const onOperation = () => {
		const current = mind;
		if (!current) return;

		const data = current.getData();
		workspace.update(id, { title: mindmapTitle(data), empty: isEmptyMindmap(data) });
		autosave?.schedule();
		// Edits can push the selected node off-screen; the map pans with transforms, not scroll.
		requestAnimationFrame(() => {
			const node = mind?.currentNode;
			if (node) mind?.scrollIntoView(node);
		});
	};

	// Mind Elixir only edits on F2 or double-click; typing on a selected node renames it, like a spreadsheet cell.
	const onKeydown = (event: KeyboardEvent) => {
		const current = mind;
		if (!current || event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
		if ((event.target as HTMLElement).id === 'input-box' || current.currentNodes.length !== 1) return;

		void current.beginEdit().then(() => {
			const box = element?.querySelector<HTMLElement>('#input-box');
			if (!box) return;
			box.textContent = event.key;
			const selection = getSelection();
			selection?.selectAllChildren(box);
			selection?.collapseToEnd();
		});
	};

	// Toolbar actions act on the selection; with nothing selected the root is the natural target.
	const selected = (current: MindElixir) => {
		if (!current.currentNode) current.selectNode(current.findEle(current.nodeData.id));
		return current.currentNode;
	};

	const tools = [
		{ label: 'Add child (Tab)', icon: Plus, run: (m: MindElixir) => m.addChild(selected(m) ?? undefined) },
		{ label: 'Add sibling (Enter)', icon: ListPlus, run: (m: MindElixir) => m.insertSibling('after', selected(m) ?? undefined) },
		{ label: 'Delete (Del)', icon: Trash, run: (m: MindElixir) => m.removeNodes(m.currentNodes) },
		{ label: 'Undo (Ctrl+Z)', icon: Undo, run: (m: MindElixir) => m.undo() },
		{ label: 'Fit to window', icon: Scan, run: (m: MindElixir) => m.scaleFit() }
	];

	const runTool = (run: (m: MindElixir) => unknown) => {
		const current = mind;
		if (!current) return;
		void run(current);
		current.container.focus({ preventScroll: true });
	};

	const flushAutosave = () => {
		void autosave?.flush();
	};

	const onVisibilityChange = () => {
		if (document.visibilityState === 'hidden') flushAutosave();
	};

	const actions: NoteActions = {
		async copyMarkdown() {
			try {
				const current = mind;
				if (!current) return;

				await navigator.clipboard.writeText(mindmapMarkdown(current.getData()));
				workspace.notify('Copied as Markdown');
			} catch (error) {
				console.error(error);
			}
		},
		async exportMarkdown() {
			try {
				const current = mind;
				if (!current) return;

				await autosave?.flush();

				const data = current.getData();
				const markdown = mindmapMarkdown(data);
				const ok = await invoke<boolean>(
					'export_file',
					new TextEncoder().encode(markdown),
					{
						headers: {
							'x-file-name': encodeURIComponent(mindmapTitle(data) || 'mind map'),
							'x-file-ext': 'md'
						}
					}
				);

				if (ok) workspace.notify('Exported');
			} catch (error) {
				console.error(error);
				workspace.notify('Export failed');
			}
		}
	};

	onMount(async () => {
		let note: { content: string } | null = null;

		try {
			note = await loadNote(id);
		} catch (error) {
			console.error(error);
		}

		if (destroyed) return;

		const data = parseMindmap(note?.content ?? '');

		try {
			const { default: MindElixirCtor } = await import('mind-elixir');
			if (destroyed) return;

			await import('mind-elixir/style.css');
			if (destroyed) return;

			if (!element) return;

			const theme: Theme = {
				name: 'mynotes',
				type: 'light',
				palette: ['#f7941d', '#5b8def', '#3fb68b', '#c86bd9', '#e5534b', '#d4a72c'],
				cssVar: {
					'--bgcolor': 'var(--bg)',
					'--color': 'var(--text)',
					'--main-color': 'var(--text)',
					'--main-bgcolor': 'var(--surface)',
					'--main-bgcolor-transparent': 'transparent',
					'--root-color': '#1d1c26',
					'--root-bgcolor': 'var(--accent)',
					'--root-border-color': 'transparent',
					'--selected': 'var(--accent)',
					'--accent-color': 'var(--accent)',
					'--panel-color': 'var(--text)',
					'--panel-bgcolor': 'var(--surface)',
					'--panel-border-color': 'var(--line)',
					'--root-radius': '10px',
					'--main-radius': '8px'
				}
			};

			const instance = new MindElixirCtor({
				el: element,
				direction: MindElixirCtor.SIDE,
				toolBar: false,
				contextMenu: true,
				keypress: true,
				// Left-drag pans like any canvas app; box selection moves to the right button.
				mouseSelectionButton: 2,
				allowUndo: true,
				newTopicName: 'Topic',
				theme
			});

			mind = instance;
			await instance.init(data);
			if (destroyed) {
				instance.destroy();
				return;
			}

			workspace.update(id, { title: mindmapTitle(data), empty: isEmptyMindmap(data) });

			autosave = createAutosave(async () => {
				const current = mind;
				if (!current) return;

				const currentData = current.getData();
				// The theme is the app's, not the note's: a stored copy would override it on reload.
				const content = JSON.stringify({ ...currentData, theme: undefined });
				await saveNote(id, mindmapTitle(currentData), content, mindmapText(currentData));
			});

			instance.bus.addListener('operation', onOperation);
			element.addEventListener('keydown', onKeydown);
			instance.selectNode(instance.findEle(instance.nodeData.id));
			instance.container.focus({ preventScroll: true });
			ready = true;
			window.addEventListener('blur', flushAutosave);
			document.addEventListener('visibilitychange', onVisibilityChange);
			workspace.setActions(actions);
		} catch (error) {
			console.error(error);
			mind?.destroy();
			mind = undefined;
		}
	});

	onDestroy(() => {
		destroyed = true;

		window.removeEventListener('blur', flushAutosave);
		document.removeEventListener('visibilitychange', onVisibilityChange);
		element?.removeEventListener('keydown', onKeydown);

		const last = mind;
		if (last) last.bus.removeListener('operation', onOperation);

		void (autosave?.flush() ?? Promise.resolve()).finally(() => last?.destroy());

		if (actions && workspace.actions === actions) workspace.setActions(null);
	});
</script>

<div class="wrap">
	<div class="mindmap" bind:this={element}></div>
	{#if ready}
		<div class="toolbar" role="toolbar" aria-label="Mind map">
			{#each tools as tool, index (tool.label)}
				{#if index === 3}<span class="sep"></span>{/if}
				<!-- mousedown is cancelled so the map keeps focus and selection. -->
				<button
					type="button"
					title={tool.label}
					aria-label={tool.label}
					onmousedown={(event) => event.preventDefault()}
					onclick={() => runTool(tool.run)}
				>
					<tool.icon size={16} />
				</button>
			{/each}
		</div>
		<p class="hint">Drag to pan · Double-click or type to edit · Drag a node onto another to move it · Right-click for more</p>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.mindmap {
		width: 100%;
		height: 100%;
	}

	.toolbar {
		position: absolute;
		left: 50%;
		bottom: 16px;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px;
		background: var(--surface);
		border: 1px solid var(--line);
		border-radius: var(--radius);
		box-shadow: var(--shadow);
	}

	.toolbar button {
		width: 30px;
		height: 30px;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--muted);
		display: grid;
		place-items: center;
	}

	.toolbar button:hover {
		background: var(--hover);
		color: var(--text);
	}

	.sep {
		width: 1px;
		height: 18px;
		background: var(--line);
		margin: 0 3px;
	}

	.hint {
		position: absolute;
		left: 16px;
		top: 10px;
		margin: 0;
		font-size: 12px;
		color: var(--muted);
		pointer-events: none;
	}

	.mindmap :global(.map-container) {
		background: var(--bg);
	}
</style>
