<script lang="ts">
	import { onDestroy, onMount, tick } from 'svelte';
	import { Editor, Extension, type JSONContent } from '@tiptap/core';
	import { Placeholder } from '@tiptap/extensions';
	import BubbleMenu from '@tiptap/extension-bubble-menu';
	import { loadNote, saveNote, saveText } from './api';
	import { titleFrom } from './text';
	import { createAutosave, type Autosave } from './autosave';
	import { workspace, type NoteActions } from './workspace.svelte';
	import { baseExtensions } from './editor/extensions';
	import { inliningClipboardSerializer, primeImages, rewriteMarkdownImages } from './editor/assets';
	import { PasteHandling } from './editor/paste';
	import { LinkClick } from './editor/links';
	import { selectionMarkdown } from './editor/markdown';
	import { FindReplace } from './editor/find';
	import FormatBar from './editor/FormatBar.svelte';
	import FindBar from './editor/FindBar.svelte';
	import './editor/editor.css';

	let { id }: { id: number } = $props();

	let element: HTMLDivElement | undefined = $state(undefined);
	let editor: Editor | undefined = $state(undefined);
	let barEl: HTMLDivElement | undefined = $state(undefined);
	let autosave: Autosave | undefined;
	let destroyed = false;
	let actions: NoteActions | null = null;
	let words: number = $state(0);
	let chars: number = $state(0);
	let countTimer: number | undefined;
	let findOpen = $state(false);
	let findReplace = $state(false);
	let findKey = $state(0);

	function flush(): void {
		void autosave?.flush();
	}

	function onVisibilityChange(): void {
		if (document.visibilityState === 'hidden') flush();
	}

	function primeEditorImages(e: Editor): void {
		const srcs: string[] = [];
		e.state.doc.descendants((node) => {
			if (node.type.name === 'image') {
				const src = node.attrs.src;
				if (typeof src === 'string') srcs.push(src);
			}
		});
		primeImages(srcs);
	}

	function updateCount(e: Editor): void {
		const text = e.state.doc.textBetween(0, e.state.doc.content.size, ' ', ' ');
		words = text.match(/\S+/g)?.length ?? 0;
		chars = text.replace(/\n/g, '').length;
	}

	function scheduleCount(e: Editor): void {
		if (countTimer !== undefined) clearTimeout(countTimer);
		countTimer = setTimeout(() => {
			countTimer = undefined;
			updateCount(e);
		}, 300);
	}

	async function copyMarkdown(): Promise<void> {
		if (!editor) return;
		try {
			await navigator.clipboard.writeText(selectionMarkdown(editor));
			workspace.notify('Copied as Markdown');
		} catch (err) {
			console.error(err);
		}
	}

	async function saveAs(): Promise<void> {
		if (!editor) return;
		try {
			await autosave?.flush();
			const md = rewriteMarkdownImages(editor.getMarkdown());
			const plain = editor.getText({ blockSeparator: '\n' });
			const title = titleFrom(plain) || 'note';
			if (await saveText(title, md, plain)) workspace.notify('Saved');
		} catch (err) {
			console.error(err);
			workspace.notify('Save failed');
		}
	}

	onMount(async () => {
		try {
			const note = await loadNote(id);
			if (destroyed || !element) return;

			let content: string | JSONContent = '';
			if (note?.content) {
				try {
					content = JSON.parse(note.content) as JSONContent;
				} catch (err) {
					console.error(err);
				}
			}

			if (!barEl) await tick();
			if (destroyed || !element || !barEl) return;

			const CopyMarkdownKey = Extension.create({
				name: 'copyMarkdownKey',
				addKeyboardShortcuts() {
					return {
						'Mod-Shift-c': () => {
							void copyMarkdown();
							return true;
						}
					};
				}
			});

			const extensions = [
				...baseExtensions(),
				Placeholder.configure({ placeholder: 'Write something…' }),
				PasteHandling,
				LinkClick,
				CopyMarkdownKey,
				FindReplace.configure({
					onOpen: (replace) => {
						findOpen = true;
						findReplace = replace;
						findKey++;
					}
				}),
				BubbleMenu.configure({
					element: barEl,
					// Find selects each match; the format bar would cover the text being searched.
					shouldShow: ({ editor, state }) =>
						!findOpen &&
						!state.selection.empty &&
						editor.isEditable &&
						!editor.isActive('image') &&
						!editor.isActive('codeBlock'),
					options: {
						placement: 'top',
						offset: 8
					}
				})
			];

			editor = new Editor({
				element,
				extensions,
				content,
				autofocus: 'end'
			});

			editor.setOptions({
				editorProps: {
					clipboardSerializer: inliningClipboardSerializer(editor.schema)
				}
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
				scheduleCount(e);
				primeEditorImages(e);
			});

			scheduleCount(editor);
			primeEditorImages(editor);

			window.addEventListener('blur', flush);
			document.addEventListener('visibilitychange', onVisibilityChange);

			actions = { copyMarkdown, saveAs };
			workspace.setActions(actions);
		} catch (err) {
			console.error(err);
		}
	});

	onDestroy(() => {
		destroyed = true;

		if (countTimer !== undefined) clearTimeout(countTimer);

		const last = editor;
		void (autosave?.flush() ?? Promise.resolve()).finally(() => last?.destroy());

		window.removeEventListener('blur', flush);
		document.removeEventListener('visibilitychange', onVisibilityChange);

		if (actions && workspace.actions === actions) {
			workspace.setActions(null);
		}
	});
</script>

<div class="doc-scroll">
	{#if findOpen}
		{#key findKey}
			<FindBar {editor} replace={findReplace} onclose={() => (findOpen = false)} />
		{/key}
	{/if}
	<FormatBar bind:el={barEl} {editor} />
	<div class="doc" bind:this={element}></div>
	<div class="word-count">
		{words} {words === 1 ? 'word' : 'words'} · {chars} {chars === 1 ? 'character' : 'characters'}
	</div>
</div>
