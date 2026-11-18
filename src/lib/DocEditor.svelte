<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { TaskItem, TaskList } from '@tiptap/extension-list';
	import Highlight from '@tiptap/extension-highlight';
	import { Placeholder } from '@tiptap/extensions';
	import { loadNote, saveNote } from './api';
	import { titleFrom } from './text';
	import { createAutosave, type Autosave } from './autosave';
	import { workspace } from './workspace.svelte';

	let { id }: { id: number } = $props();

	let element: HTMLDivElement | undefined = $state(undefined);
	let editor: Editor | undefined;
	let autosave: Autosave | undefined;
	let destroyed = false;

	function flush(): void {
		void autosave?.flush();
	}

	function onVisibilityChange(): void {
		if (document.visibilityState === 'hidden') flush();
	}

	onMount(async () => {
		try {
			const note = await loadNote(id);
			if (destroyed || !element) return;

			let content: string | object = '';
			if (note?.content) {
				try {
					content = JSON.parse(note.content);
				} catch (err) {
					console.error(err);
				}
			}

			editor = new Editor({
				element,
				extensions: [
					StarterKit.configure({
						link: {
							openOnClick: false,
							autolink: true,
							defaultProtocol: 'https'
						}
					}),
					Highlight,
					TaskList,
					TaskItem.configure({ nested: true }),
					Placeholder.configure({ placeholder: 'Write something…' })
				],
				content,
				autofocus: 'end'
			});

			workspace.update(id, {
				title: titleFrom(editor.getText()),
				empty: editor.isEmpty
			});

			autosave = createAutosave(async () => {
				if (!editor) return;
				const text = editor.getText({ blockSeparator: '\n' });
				await saveNote(id, titleFrom(text), JSON.stringify(editor.getJSON()), text);
			});

			editor.on('update', ({ editor: e }) => {
				workspace.update(id, {
					title: titleFrom(e.getText()),
					empty: e.isEmpty
				});
				autosave?.schedule();
			});

			window.addEventListener('blur', flush);
			document.addEventListener('visibilitychange', onVisibilityChange);
		} catch (err) {
			console.error(err);
		}
	});

	onDestroy(() => {
		destroyed = true;
		// The editor must outlive a save still queued behind an in-flight one.
		const last = editor;
		void (autosave?.flush() ?? Promise.resolve()).finally(() => last?.destroy());
		window.removeEventListener('blur', flush);
		document.removeEventListener('visibilitychange', onVisibilityChange);
	});
</script>

<div class="doc-scroll">
	<div class="doc" bind:this={element}></div>
</div>
