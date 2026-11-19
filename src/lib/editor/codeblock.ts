import CodeBlock from '@tiptap/extension-code-block';
import type { Editor } from '@tiptap/core';
import { Node as PMNode, DOMSerializer } from '@tiptap/pm/model';
import type { ViewMutationRecord } from '@tiptap/pm/view';
import { safeHref } from './links';
import { openUrl } from '@tauri-apps/plugin-opener';

type MarkdownEditor = Editor & { markdown?: { parse(markdown: string): unknown } };

export function renderMarkdown(editor: Editor, markdown: string, target: HTMLElement): void {
	try {
		const json = (editor as MarkdownEditor).markdown?.parse(markdown);

		if (!json) {
			target.textContent = markdown;
			return;
		}

		// Built through the editor schema: only node types and attributes it allows
		// reach the DOM, so note content cannot inject raw HTML.
		const doc = PMNode.fromJSON(editor.schema, json as object);
		target.replaceChildren(DOMSerializer.fromSchema(editor.schema).serializeFragment(doc.content));

		target.querySelectorAll('a[href]').forEach((anchor) => {
			const href = anchor.getAttribute('href') ?? '';
			const safe = safeHref(href);

			if (!safe) {
				anchor.removeAttribute('href');
			}
		});
	} catch {
		target.textContent = markdown;
	}
}

export const MarkdownCodeBlock = CodeBlock.extend({
	addNodeView() {
		return ({ node, editor }: { node: PMNode; editor: Editor }) => {
			const dom = document.createElement('div');
			dom.className = 'code-block';

			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'code-toggle';
			button.setAttribute('contenteditable', 'false');
			button.setAttribute('aria-pressed', 'false');
			button.textContent = 'Preview';

			const pre = document.createElement('pre');
			const code = document.createElement('code');
			pre.appendChild(code);

			const preview = document.createElement('div');
			preview.className = 'md-preview';
			preview.setAttribute('contenteditable', 'false');
			preview.hidden = true;

			dom.append(button, pre, preview);

			let current = node;
			let isPreview = false;

			const isMarkdownLanguage = (language: unknown) => {
				const value = String(language ?? '').toLowerCase();

				return value === 'markdown' || value === 'md';
			};

			const sync = () => {
				const className = current.attrs.language ? `language-${current.attrs.language}` : '';
				if (code.className !== className) code.className = className;
				const canPreview = isMarkdownLanguage(current.attrs.language);

				button.hidden = !canPreview;

				if (!canPreview) {
					isPreview = false;
				}

				pre.hidden = isPreview;
				preview.hidden = !isPreview;
				button.textContent = isPreview ? 'Source' : 'Preview';
				button.setAttribute('aria-pressed', String(isPreview));

				if (isPreview) {
					renderMarkdown(editor, current.textContent, preview);
				}
			};

			const toggle = () => {
				isPreview = !isPreview;
				sync();
			};

			button.addEventListener('mousedown', (event) => {
				event.preventDefault();
				toggle();
			});

			preview.addEventListener('click', (event) => {
				event.preventDefault();

				if (!event.ctrlKey) {
					return;
				}

				const target = event.target;
				const element = target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
				const href = element?.closest('a[href]')?.getAttribute('href');

				if (!href) {
					return;
				}

				const safe = safeHref(href);

				if (!safe) {
					return;
				}

				openUrl(safe).catch((err) => console.error(err));
			});

			sync();

			return {
				dom,
				contentDOM: code,
				update(newNode: PMNode): boolean {
					if (newNode.type !== current.type) {
						return false;
					}

					current = newNode;
					sync();

					return true;
				},
				// Attribute writes come from sync() only; letting ProseMirror see them makes it
				// re-read the block from the DOM and redraw it, losing the preview state.
				ignoreMutation(mutation: ViewMutationRecord): boolean {
					if (mutation.type === 'attributes') return true;
					return !code.contains(mutation.target);
				},
				stopEvent(event: Event): boolean {
					return event.target instanceof Node && (button.contains(event.target) || preview.contains(event.target));
				}
			};
		};
	}
});
