import { describe, expect, it } from 'vitest';
import type { MindElixirData, NodeObj } from 'mind-elixir';
import {
	DEFAULT_TOPIC,
	isEmptyMindmap,
	mindmapMarkdown,
	mindmapText,
	mindmapTitle,
	newMindmap,
	parseMindmap
} from './mindmap';

describe('parseMindmap', () => {
	it('returns the default mindmap for empty or invalid content', () => {
		const fallback = newMindmap();

		expect(parseMindmap('')).toEqual(fallback);
		expect(parseMindmap('not json')).toEqual(fallback);
		expect(parseMindmap('{"nodeData":5}')).toEqual(fallback);
		expect(parseMindmap('{"nodeData":{"topic":1,"id":"x"}}')).toEqual(fallback);
		expect(parseMindmap('[]')).toEqual(fallback);
		expect(parseMindmap('null')).toEqual(fallback);
	});

	it('round-trips valid mindmap data', () => {
		const data: MindElixirData = {
			nodeData: {
				id: 'root',
				topic: 'Root',
				children: [
					{ id: 'a', topic: 'A', children: [{ id: 'a1', topic: 'A1' }] },
					{ id: 'b', topic: 'B' }
				]
			}
		};

		expect(parseMindmap(JSON.stringify(data))).toEqual(data);
	});
});

describe('isEmptyMindmap', () => {
	it('is true for a new mindmap', () => {
		expect(isEmptyMindmap(newMindmap())).toBe(true);
	});

	it('is false after adding a child', () => {
		const data: MindElixirData = {
			nodeData: {
				id: 'root',
				topic: DEFAULT_TOPIC,
				children: [{ id: 'child', topic: 'Child' }]
			}
		};

		expect(isEmptyMindmap(data)).toBe(false);
	});

	it('is false after renaming the root', () => {
		const data: MindElixirData = {
			nodeData: { id: 'root', topic: 'Renamed', children: [] }
		};

		expect(isEmptyMindmap(data)).toBe(false);
	});
});

describe('mindmapTitle', () => {
	it('returns an empty string for the default topic', () => {
		expect(mindmapTitle(newMindmap())).toBe('');
		expect(mindmapTitle({ nodeData: { id: 'root', topic: '  Mind  map ' } })).toBe('');
	});

	it('collapses whitespace and truncates to 60 characters', () => {
		expect(mindmapTitle({ nodeData: { id: 'root', topic: '  Hello   World ' } })).toBe('Hello World');
		expect(mindmapTitle({ nodeData: { id: 'root', topic: 'a'.repeat(70) } })).toBe('a'.repeat(60));
	});
});

describe('mindmapText', () => {
	it('lists every topic depth-first', () => {
		const data: MindElixirData = {
			nodeData: {
				id: 'root',
				topic: 'A',
				children: [
					{ id: 'b', topic: 'B', children: [{ id: 'c', topic: 'C' }] },
					{ id: 'd', topic: 'D' }
				]
			}
		};

		expect(mindmapText(data)).toBe('A\nB\nC\nD');
	});
});

describe('mindmapMarkdown', () => {
	it('renders a three-level outline exactly', () => {
		const data: MindElixirData = {
			nodeData: {
				id: 'root',
				topic: 'A',
				children: [
					{ id: 'b', topic: 'B', children: [{ id: 'c', topic: 'C' }] },
					{ id: 'd', topic: 'D' }
				]
			}
		};

		expect(mindmapMarkdown(data)).toBe('# A\n- B\n  - C\n- D\n');
	});

	it('does not throw on a 10000-deep chain', () => {
		let node: NodeObj = { id: 'n0', topic: 'N0' };

		for (let i = 1; i < 10000; i += 1) {
			node = { id: `n${i}`, topic: `N${i}`, children: [node] };
		}

		const data: MindElixirData = { nodeData: node };

		expect(() => mindmapText(data)).not.toThrow();
		expect(() => mindmapMarkdown(data)).not.toThrow();
	});
});
