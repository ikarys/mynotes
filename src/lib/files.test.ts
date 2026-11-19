// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { importedDoc } from './files';

describe('importedDoc', () => {
	it('parses markdown', () => {
		const { json, text } = importedDoc({ markdown: true, text: '# Title\n\n**bold**' });

		expect(json.content?.[0]?.type).toBe('heading');
		expect(text).toContain('Title');
	});

	it('keeps plain text literal', () => {
		const { json } = importedDoc({ markdown: false, text: '<b>x</b>\n\nline' });

		expect(json.content?.length).toBe(3);
		expect(json.content?.[0]?.content?.[0]?.text).toBe('<b>x</b>');
		expect(json.content?.[1]?.content).toBeUndefined();
	});

	it('does not parse markdown in plain text', () => {
		const { json } = importedDoc({ markdown: false, text: '# not a heading' });

		expect(json.content?.[0]?.type).toBe('paragraph');
	});
});
