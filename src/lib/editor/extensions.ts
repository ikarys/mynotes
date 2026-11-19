import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Image from '@tiptap/extension-image';
import { Markdown } from '@tiptap/markdown';
import { MarkdownCodeBlock } from './codeblock';

export function baseExtensions(): AnyExtension[] {
	return [
		StarterKit.configure({
			codeBlock: false,
			link: {
				openOnClick: false,
				autolink: true,
				defaultProtocol: 'https'
			}
		}),
		MarkdownCodeBlock,
		Highlight,
		TaskList,
		TaskItem.configure({ nested: true }),
		Image.configure({
			allowBase64: true,
			resize: {
				enabled: true,
				alwaysPreserveAspectRatio: true,
				minWidth: 48,
				minHeight: 48,
				directions: ['bottom-right', 'bottom-left', 'top-right', 'top-left']
			}
		}),
		Markdown
	];
}
