// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { FONTS, parseFont, parseSize, typography } from './typography.svelte';

beforeEach(() => {
	localStorage.clear();
	document.documentElement.style.removeProperty('--note-font');
	document.documentElement.style.removeProperty('--note-size');
	typography.setFont('system');
	typography.setSize(15);
});

describe('parseFont', () => {
	it('returns a known font id', () => {
		expect(parseFont('serif')).toBe('serif');
	});
	it('returns the default font for unknown, null, and injection values', () => {
		expect(parseFont('unknown')).toBe('system');
		expect(parseFont(null)).toBe('system');
		expect(parseFont('x; background:url(evil)')).toBe('system');
	});
});

describe('parseSize', () => {
	it('parses valid digit strings and clamps to the allowed range', () => {
		expect(parseSize('18')).toBe(18);
		expect(parseSize('5')).toBe(11);
		expect(parseSize('99')).toBe(28);
	});
	it('returns the default size for invalid values', () => {
		expect(parseSize(null)).toBe(15);
		expect(parseSize('')).toBe(15);
		expect(parseSize('16px')).toBe(15);
		expect(parseSize('1e2')).toBe(15);
		expect(parseSize('-3')).toBe(15);
		expect(parseSize('12.5')).toBe(15);
	});
});

describe('typography', () => {
	it('applies a non-default font and removes the key for the default font', () => {
		typography.setFont('serif');
		const georgia = FONTS.find((font) => font.id === 'serif');
		expect(document.documentElement.style.getPropertyValue('--note-font')).toBe(georgia?.stack);
		expect(localStorage.getItem('mynotes.font')).toBe('serif');
		typography.setFont('system');
		expect(localStorage.getItem('mynotes.font')).toBeNull();
	});
	it('clamps size, applies the CSS variable, and removes the key for the default size', () => {
		typography.setSize(40);
		expect(typography.size).toBe(28);
		expect(document.documentElement.style.getPropertyValue('--note-size')).toBe('28px');
		expect(localStorage.getItem('mynotes.fontSize')).toBe('28');
		typography.setSize(15);
		expect(localStorage.getItem('mynotes.fontSize')).toBeNull();
	});
});
