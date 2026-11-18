// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { baseExtensions } from './extensions';
import { looksLikeMarkdown } from './markdown';

function roundTrip(md: string): void {
	const first = new Editor({
		extensions: baseExtensions(),
		content: md,
		contentType: 'markdown'
	});
	const firstJson = first.getJSON();
	const serialized = first.getMarkdown();
	first.destroy();

	const second = new Editor({
		extensions: baseExtensions(),
		content: serialized,
		contentType: 'markdown'
	});
	const secondJson = second.getJSON();
	second.destroy();

	expect(secondJson).toEqual(firstJson);
}

describe('markdown round trip', () => {
	it('headings', () => {
		roundTrip('# One\n## Two\n### Three');
	});

	it('bold italic strike', () => {
		roundTrip('**bold** *italic* ~~strike~~');
	});

	it('bullet and ordered lists', () => {
		roundTrip('- a\n- b\n\n1. one\n2. two');
	});

	it('task list checked and unchecked', () => {
		roundTrip('- [x] done\n- [ ] todo');
	});

	it('blockquote', () => {
		roundTrip('> quoted');
	});

	it('code block with language', () => {
		roundTrip('```rust\nfn main() {}\n```');
	});

	it('link', () => {
		roundTrip('[example](https://example.com)');
	});

	it('image', () => {
		roundTrip('![alt](https://example.com/image.png)');
	});
});

describe('looksLikeMarkdown', () => {
	it('detects markdown', () => {
		expect(looksLikeMarkdown('# Title')).toBe(true);
		expect(looksLikeMarkdown('- item')).toBe(true);
		expect(looksLikeMarkdown('1. step')).toBe(true);
		expect(looksLikeMarkdown('**bold** word')).toBe(true);
		expect(looksLikeMarkdown('[a](https://x.y)')).toBe(true);
		expect(looksLikeMarkdown('- [ ] todo')).toBe(true);
	});

	it('rejects plain prose', () => {
		expect(looksLikeMarkdown('Hello world.')).toBe(false);
		expect(looksLikeMarkdown('Price: 5 * 3')).toBe(false);
		expect(looksLikeMarkdown('a - b')).toBe(false);
	});
});
