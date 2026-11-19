// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { baseExtensions } from './extensions';
import { FindReplace, findMatches } from './find';

function createEditor(content: string): Editor {
	return new Editor({
		extensions: [...baseExtensions(), FindReplace],
		content,
		contentType: 'markdown'
	});
}

describe('FindReplace', () => {
	it('finds case-insensitive matches in two paragraphs', () => {
		const editor = createEditor('Hello hello\n\nworld Hello');
		const doc = editor.state.doc;
		const matches = findMatches(doc, 'hello');

		expect(matches).toHaveLength(3);
		expect(doc.textBetween(matches[0].from, matches[0].to)).toBe('Hello');
		expect(doc.textBetween(matches[1].from, matches[1].to)).toBe('hello');
		expect(doc.textBetween(matches[2].from, matches[2].to)).toBe('Hello');

		editor.destroy();
	});

	it('respects caseSensitive', () => {
		const editor = createEditor('Hello hello\n\nworld Hello');
		const doc = editor.state.doc;

		const lower = findMatches(doc, 'hello', true);
		expect(lower).toHaveLength(1);
		expect(doc.textBetween(lower[0].from, lower[0].to)).toBe('hello');

		const upper = findMatches(doc, 'Hello', true);
		expect(upper).toHaveLength(2);

		editor.destroy();
	});

	it('ignores an empty query', () => {
		const editor = createEditor('anything');
		expect(findMatches(editor.state.doc, '')).toEqual([]);
		editor.destroy();
	});

	it('treats regex characters like .* literally', () => {
		const editor = createEditor('a.*b');
		const doc = editor.state.doc;
		const matches = findMatches(doc, '.*');

		expect(matches).toHaveLength(1);
		expect(doc.textBetween(matches[0].from, matches[0].to)).toBe('.*');

		editor.destroy();
	});

	it('replaceAll replaces every match in one undo step', () => {
		const editor = createEditor('foo bar foo');

		editor.commands.setFindQuery('foo');
		editor.commands.replaceAll('baz');

		expect(editor.getText()).toBe('baz bar baz');

		editor.commands.undo();
		expect(editor.getText()).toBe('foo bar foo');

		editor.destroy();
	});

	it('replaceCurrent replaces only one match', () => {
		const editor = createEditor('foo bar foo');

		editor.commands.setFindQuery('foo');
		editor.commands.replaceCurrent('baz');

		expect(editor.getText()).toBe('baz bar foo');

		editor.destroy();
	});

	it('replaceCurrent moves past a replacement that contains the query', () => {
		const editor = createEditor('foo bar foo');

		editor.commands.setFindQuery('foo');
		editor.commands.replaceCurrent('foofoo');
		editor.commands.replaceCurrent('foofoo');

		expect(editor.getText()).toBe('foofoo bar foofoo');

		editor.destroy();
	});
});
