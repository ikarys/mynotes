// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { baseExtensions } from './extensions';

describe('MarkdownCodeBlock', () => {
	it('keeps the preview after ProseMirror processes DOM mutations', async () => {
		const editor = new Editor({
			extensions: baseExtensions(),
			content: '```markdown\n# Title\n```',
			contentType: 'markdown'
		});
		const block = editor.view.dom.querySelector('.code-block');
		const toggle = editor.view.dom.querySelector('.code-toggle') as HTMLButtonElement;
		toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		await new Promise((resolve) => setTimeout(resolve, 50));

		expect(editor.view.dom.querySelector('.code-block')).toBe(block);
		expect(editor.view.dom.querySelector('.md-preview h1')?.textContent).toBe('Title');
		expect(editor.state.doc.textContent).toBe('# Title');
		editor.destroy();
	});

	it('toggles markdown preview', () => {
		const editor = new Editor({
			extensions: baseExtensions(),
			content: '```markdown\n**bold** text\n```',
			contentType: 'markdown'
		});

		const toggle = editor.view.dom.querySelector('.code-toggle') as HTMLButtonElement;
		expect(toggle.hidden).toBe(false);

		toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

		const preview = editor.view.dom.querySelector('.md-preview') as HTMLElement;
		const pre = editor.view.dom.querySelector('pre') as HTMLPreElement;
		expect(preview.querySelector('strong')?.textContent).toBe('bold');
		expect(pre.hidden).toBe(true);
		expect(toggle.textContent).toBe('Source');

		toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		expect(pre.hidden).toBe(false);
		expect(preview.hidden).toBe(true);

		editor.destroy();
	});

	it('hides toggle for non-markdown code', () => {
		const editor = new Editor({
			extensions: baseExtensions(),
			content: '```js\nconst a = 1\n```',
			contentType: 'markdown'
		});

		const toggle = editor.view.dom.querySelector('.code-toggle') as HTMLButtonElement;
		expect(toggle.hidden).toBe(true);

		editor.destroy();
	});

	it('offers the toggle on a bare fence', () => {
		const editor = new Editor({
			extensions: baseExtensions(),
			content: '```\n# Title\n```',
			contentType: 'markdown'
		});

		const toggle = editor.view.dom.querySelector('.code-toggle') as HTMLButtonElement;
		expect(toggle.hidden).toBe(false);

		editor.destroy();
	});

	it('does not expose hostile attributes in preview', () => {
		const editor = new Editor({
			extensions: baseExtensions(),
			content: '```markdown\n<img src=x onerror="alert(1)">\n\n[x](javascript:alert(1))\n```',
			contentType: 'markdown'
		});

		const toggle = editor.view.dom.querySelector('.code-toggle') as HTMLButtonElement;
		toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

		const preview = editor.view.dom.querySelector('.md-preview') as HTMLElement;
		expect(preview.querySelector('[onerror]')).toBeNull();

		preview.querySelectorAll('a').forEach((anchor) => {
			const href = anchor.getAttribute('href') ?? '';
			expect(href.toLowerCase().startsWith('javascript:')).toBe(false);
		});

		editor.destroy();
	});

	it('round trips markdown', () => {
		const editor = new Editor({
			extensions: baseExtensions(),
			content: '```markdown\n**bold** text\n```',
			contentType: 'markdown'
		});

		const toggle = editor.view.dom.querySelector('.code-toggle') as HTMLButtonElement;
		toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
		toggle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));

		expect(editor.getMarkdown()).toContain('```markdown');
		expect(editor.getMarkdown()).toContain('**bold** text');

		editor.destroy();
	});

	it('highlights named JSON and YAML blocks, not bare fences', () => {
		const render = (content: string) => {
			const editor = new Editor({ extensions: baseExtensions(), content, contentType: 'markdown' });
			const html = editor.view.dom.innerHTML;
			editor.destroy();
			return html;
		};

		expect(render('```json\n{"a": 1}\n```')).toContain('hljs-attr');
		expect(render('```yml\nkey: value\n```')).toContain('hljs-attr');
		expect(render('```\nkey: value\n# Title\n```')).not.toContain('hljs-');
	});

	it('sets the language of an existing block from its selector', () => {
		const editor = new Editor({ extensions: baseExtensions(), content: '```\n{"a": 1}\n```', contentType: 'markdown' });
		const select = editor.view.dom.querySelector('.code-lang') as HTMLSelectElement;
		expect(select.value).toBe('');

		select.value = 'json';
		select.dispatchEvent(new Event('change'));

		expect(editor.getMarkdown()).toContain('```json');
		expect(editor.view.dom.innerHTML).toContain('hljs-attr');
		expect((editor.view.dom.querySelector('.code-lang') as HTMLSelectElement).value).toBe('json');
		editor.destroy();
	});

	it('keeps a language the selector does not list', () => {
		const editor = new Editor({ extensions: baseExtensions(), content: '```rust\nfn main() {}\n```', contentType: 'markdown' });
		expect((editor.view.dom.querySelector('.code-lang') as HTMLSelectElement).value).toBe('rust');
		editor.destroy();
	});
});
