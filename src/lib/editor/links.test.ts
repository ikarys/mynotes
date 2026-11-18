// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { safeHref } from './links';

describe('safeHref', () => {
	it('adds https to bare domains', () => {
		expect(safeHref('example.com')).toBe('https://example.com/');
	});

	it('keeps https urls', () => {
		expect(safeHref('https://a.b/c')).toBe('https://a.b/c');
	});

	it('keeps mailto urls', () => {
		expect(safeHref('mailto:x@y.z')).toBe('mailto:x@y.z');
	});

	it('blocks javascript urls', () => {
		expect(safeHref('javascript:alert(1)')).toBeNull();
	});

	it('blocks file urls', () => {
		expect(safeHref('file:///C:/x')).toBeNull();
	});

	it('returns null for empty input', () => {
		expect(safeHref('')).toBeNull();
	});
});
