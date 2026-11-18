import type { MindElixirData, NodeObj } from 'mind-elixir';

export const DEFAULT_TOPIC = 'Mind map';

export function newMindmap(): MindElixirData {
	return { nodeData: { id: 'root', topic: DEFAULT_TOPIC, children: [] } };
}

function isMindElixirData(value: unknown): value is MindElixirData {
	if (typeof value !== 'object' || value === null) return false;

	const root = (value as Record<string, unknown>).nodeData;
	if (typeof root !== 'object' || root === null) return false;

	const stack: unknown[] = [root];

	while (stack.length > 0) {
		const node = stack.pop();
		if (node === undefined || typeof node !== 'object' || node === null) return false;

		const record = node as Record<string, unknown>;
		if (typeof record.topic !== 'string' || typeof record.id !== 'string') return false;

		if (record.children !== undefined) {
			if (!Array.isArray(record.children)) return false;
			for (const child of record.children) {
				stack.push(child);
			}
		}
	}

	return true;
}

export function parseMindmap(content: string): MindElixirData {
	if (content === '') return newMindmap();

	try {
		const parsed: unknown = JSON.parse(content);
		if (isMindElixirData(parsed)) return parsed;
	} catch {
		// Disk content is hostile; JSON.parse may throw.
	}

	return newMindmap();
}

export function isEmptyMindmap(data: MindElixirData): boolean {
	const topic = data.nodeData.topic.trim();
	return (data.nodeData.children?.length ?? 0) === 0 && (topic === '' || topic === DEFAULT_TOPIC);
}

export function mindmapTitle(data: MindElixirData): string {
	const topic = data.nodeData.topic.trim().replace(/\s+/g, ' ');
	if (topic === DEFAULT_TOPIC) return '';
	return topic.slice(0, 60);
}

export function mindmapText(data: MindElixirData): string {
	const lines: string[] = [];
	const stack: NodeObj[] = [data.nodeData];

	while (stack.length > 0) {
		const node = stack.pop();
		if (node === undefined) break;

		lines.push(node.topic);

		const children = node.children;
		if (children) {
			for (let i = children.length - 1; i >= 0; i -= 1) {
				stack.push(children[i]);
			}
		}
	}

	return lines.join('\n');
}

export function mindmapMarkdown(data: MindElixirData): string {
	const lines: string[] = [];
	const stack: Array<{ node: NodeObj; depth: number }> = [{ node: data.nodeData, depth: 0 }];

	while (stack.length > 0) {
		const entry = stack.pop();
		if (entry === undefined) break;

		const topic = entry.node.topic.replace(/\n/g, ' ');

		if (entry.depth === 0) {
			lines.push(`# ${topic}`);
		} else {
			lines.push(`${' '.repeat((entry.depth - 1) * 2)}- ${topic}`);
		}

		const children = entry.node.children;
		if (children) {
			for (let i = children.length - 1; i >= 0; i -= 1) {
				stack.push({ node: children[i], depth: entry.depth + 1 });
			}
		}
	}

	return `${lines.join('\n')}\n`;
}
