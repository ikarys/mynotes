import { describe, expect, it } from 'vitest';
import { dayGroup, excerptFrom, titleFrom } from './text';

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

describe('excerptFrom', () => {
	it('drops the title line and joins the rest', () => {
		expect(excerptFrom('\n  Title\nfirst  line\n\nsecond')).toBe('first line second');
	});

	it('is empty when there is only a title', () => {
		expect(excerptFrom('Title')).toBe('');
		expect(excerptFrom('')).toBe('');
	});
});

describe('dayGroup', () => {
	const now = new Date(2026, 10, 19, 0, 10).getTime();

	it('uses calendar days, not 24 hour windows', () => {
		expect(dayGroup(new Date(2026, 10, 19, 0, 5).getTime(), now)).toBe('Today');
		expect(dayGroup(new Date(2026, 10, 18, 23, 50).getTime(), now)).toBe('Yesterday');
		expect(dayGroup(new Date(2026, 10, 18, 0, 0).getTime(), now)).toBe('Yesterday');
		expect(dayGroup(new Date(2026, 10, 17, 23, 59).getTime(), now)).toBe('Earlier');
	});
});
