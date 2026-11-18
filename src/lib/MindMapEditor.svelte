<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { loadNote, saveNote } from './api';
	import { createAutosave, type Autosave } from './autosave';
	import { workspace, type NoteActions } from './workspace.svelte';
	import { invoke } from '@tauri-apps/api/core';
	import type MindElixir from 'mind-elixir';
	import type { Theme } from 'mind-elixir';
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
	let autosave: Autosave | undefined;
	let destroyed = false;

	const onOperation = () => {
		const current = mind;
		if (!current) return;

		const data = current.getData();
		workspace.update(id, { title: mindmapTitle(data), empty: isEmptyMindmap(data) });
		autosave?.schedule();
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
				await saveNote(id, mindmapTitle(currentData), JSON.stringify(currentData), mindmapText(currentData));
			});

			instance.bus.addListener('operation', onOperation);
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

		const last = mind;
		if (last) last.bus.removeListener('operation', onOperation);

		void (autosave?.flush() ?? Promise.resolve()).finally(() => last?.destroy());

		if (actions && workspace.actions === actions) workspace.setActions(null);
	});
</script>

<div class="mindmap" bind:this={element}></div>

<style>
	.mindmap {
		width: 100%;
		height: 100%;
	}

	.mindmap :global(.map-container) {
		background: var(--bg);
	}
</style>
