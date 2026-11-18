import type { Editor } from '@tiptap/core';
import { rewriteMarkdownImages } from './assets';

const blockMarker = /^(#{1,6}\s|\s*[-*+]\s|\s*\d+\.\s|>\s|```|\s*[-*+]\s\[[ xX]\]\s)/m;
const inlineSyntax = /\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^)\s]+\)|`[^`\n]+`/;

export function looksLikeMarkdown(text: string): boolean {
	return blockMarker.test(text) || inlineSyntax.test(text);
}

export function selectionMarkdown(editor: Editor): string {
	const { selection } = editor.state;
	const md = selection.empty
		? editor.getMarkdown()
		: (editor.markdown?.serialize({ type: 'doc', content: selection.content().content.toJSON() }) ??
			editor.getText());
	return rewriteMarkdownImages(md);
}
