import { describe, expect, it } from 'vitest';
import { titleFrom } from './text';

describe('titleFrom', () => {
	it('skips blank lines', () => {
		expect(titleFrom('\n\n   \n  hello world\n')).toBe('hello world');
	});

	it('collapses inner whitespace', () => {
		expect(titleFrom('a   b\t\nc')).toBe('a b');
	});

	it('cuts to 60 characters', () => {
		expect(titleFrom('a'.repeat(61))).toBe('a'.repeat(60));
	});

	it('returns empty string for empty input', () => {
		expect(titleFrom('')).toBe('');
	});
});
