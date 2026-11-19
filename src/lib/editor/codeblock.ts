import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
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

// Only JSON and YAML: every highlight.js grammar adds to the bundle, and the app must stay light.
const lowlight = createLowlight({ json, yaml });
lowlight.registerAlias({ yaml: ['yml'] });

// Auto-detection would colour plain and Markdown fences as YAML; only a named language is highlighted.
const namedOnly = {
	highlight: (language: string, value: string) => lowlight.highlight(language, value),
	listLanguages: () => lowlight.listLanguages(),
	registered: (language: string) => lowlight.registered(language),
	highlightAuto: () => ({ children: [] })
};

export const MarkdownCodeBlock = CodeBlockLowlight.extend({
	addNodeView() {
		return ({ node, editor }: { node: PMNode; editor: Editor }) => {
			const dom = document.createElement('div');
			dom.className = 'code-block';

			const actions = document.createElement('div');
			actions.className = 'code-actions';
			actions.setAttribute('contenteditable', 'false');

			const copy = document.createElement('button');
			copy.type = 'button';
			copy.className = 'code-copy';
			copy.setAttribute('contenteditable', 'false');
			copy.textContent = 'Copy';

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

			actions.append(copy, button);
			dom.append(actions, pre, preview);

			let current = node;
			let isPreview = false;
			let copyTimer: number | undefined;

			const isMarkdownLanguage = (language: unknown) => {
				const value = String(language ?? '').toLowerCase();

				// A bare ``` fence is treated as markdown: it is how notes are usually typed.
				return value === '' || value === 'markdown' || value === 'md';
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

			copy.addEventListener('mousedown', (event) => {
				event.preventDefault();
				navigator.clipboard
					.writeText(current.textContent)
					.then(() => {
						copy.textContent = 'Copied';
						if (copyTimer !== undefined) clearTimeout(copyTimer);
						copyTimer = window.setTimeout(() => {
							copy.textContent = 'Copy';
							copyTimer = undefined;
						}, 1200);
					})
					.catch((err) => console.error(err));
			});

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
					return event.target instanceof Node && (actions.contains(event.target) || preview.contains(event.target));
				}
			};
		};
	}
}).configure({ lowlight: namedOnly });
