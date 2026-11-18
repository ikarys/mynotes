import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { looksLikeMarkdown } from './markdown';

export async function saveImage(file: Blob): Promise<string> {
	const bytes = new Uint8Array(await file.arrayBuffer());
	const path = await invoke<string>('save_image', bytes);
	return convertFileSrc(path);
}

function imageFiles(data: DataTransfer | null): File[] {
	if (!data) return [];

	const files: File[] = [];
	for (const item of Array.from(data.items)) {
		if (item.kind === 'file' && item.type.startsWith('image/')) {
			const file = item.getAsFile();
			if (file) files.push(file);
		}
	}
	return files;
}

async function insertImages(editor: Editor, pos: number, files: File[]): Promise<void> {
	const images = [];
	for (const file of files) {
		try {
			images.push({ type: 'image', attrs: { src: await saveImage(file) } });
		} catch (err) {
			console.error(err);
		}
	}
	// The document may have changed during the saves; the position is clamped.
	const at = Math.min(pos, editor.state.doc.content.size);
	if (images.length > 0) editor.chain().focus().insertContentAt(at, images).run();
}

export const PasteHandling = Extension.create({
	name: 'pasteHandling',
	addProseMirrorPlugins() {
		const editor = this.editor;
		return [
			new Plugin({
				key: new PluginKey('pasteHandling'),
				props: {
					handlePaste(view: EditorView, event: ClipboardEvent): boolean {
						const files = imageFiles(event.clipboardData);
						if (files.length > 0) {
							event.preventDefault();
							void insertImages(editor, view.state.selection.from, files);
							return true;
						}

						const text = event.clipboardData?.getData('text/plain');
						const html = event.clipboardData?.getData('text/html');
						if (text && !html && looksLikeMarkdown(text)) {
							event.preventDefault();
							editor.commands.insertContent(text, { contentType: 'markdown' });
							return true;
						}

						return false;
					},
					handleDrop(view: EditorView, event: DragEvent): boolean {
						const files = imageFiles(event.dataTransfer);
						if (files.length === 0) return false;

						event.preventDefault();
						const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
						if (coords) void insertImages(editor, coords.pos, files);
						return true;
					}
				}
			})
		];
	}
});
