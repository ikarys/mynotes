import { Editor, type JSONContent } from '@tiptap/core';
import { baseExtensions } from './editor/extensions';

export function importedDoc(file: { markdown: boolean; text: string }): { json: JSONContent; text: string } {
	if (file.markdown) {
		const editor = new Editor({
			extensions: baseExtensions(),
			content: file.text,
			contentType: 'markdown'
		});

		try {
			return {
				json: editor.getJSON(),
				text: editor.getText({ blockSeparator: '\n' })
			};
		} finally {
			editor.destroy();
		}
	}

	// a .txt is never interpreted as Markdown or HTML
	const json: JSONContent = {
		type: 'doc',
		content: file.text.split('\n').map((line) =>
			line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' }
		)
	};

	return { json, text: file.text };
}
