import { DOMSerializer } from '@tiptap/pm/model';
import type { Fragment, Schema } from '@tiptap/pm/model';

export function isAssetUrl(src: string): boolean {
	return src.startsWith('http://asset.localhost/') || src.startsWith('asset://localhost/');
}

export function assetUrlToFileUrl(src: string): string {
	if (!isAssetUrl(src)) return src;

	const prefix = src.startsWith('http://') ? 'http://asset.localhost/' : 'asset://localhost/';
	const encoded = src.slice(prefix.length);

	let path: string;
	try {
		path = decodeURIComponent(encoded);
	} catch (err) {
		console.error(err);
		return src;
	}

	const normalized = path.replace(/\\/g, '/');
	const match = normalized.match(/^([A-Za-z]):\/(.*)$/);
	if (!match) return src;

	const drive = match[1].toUpperCase();
	const segments = match[2]
		.split('/')
		.filter((segment) => segment.length > 0)
		.map((segment) => encodeURIComponent(segment));

	return `file:///${drive}:${segments.length > 0 ? `/${segments.join('/')}` : ''}`;
}

export function rewriteMarkdownImages(md: string): string {
	return md.replace(
		/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
		(match, alt: string, target: string, title?: string) => {
			if (!isAssetUrl(target)) return match;
			const fileUrl = assetUrlToFileUrl(target);
			return `![${alt}]<${fileUrl}>${title ? ` "${title}"` : ''}`;
		}
	);
}

export async function toDataUrl(src: string): Promise<string> {
	const response = await fetch(src);
	if (!response.ok) throw new Error(`Failed to fetch ${src}: ${response.status}`);
	const blob = await response.blob();

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
		reader.readAsDataURL(blob);
	});
}

export const dataUrlCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export function primeImages(srcs: Iterable<string>): void {
	for (const src of srcs) {
		if (!isAssetUrl(src) || dataUrlCache.has(src) || inflight.has(src)) continue;

		const promise = toDataUrl(src)
			.then((dataUrl) => {
				dataUrlCache.set(src, dataUrl);
				inflight.delete(src);
				return dataUrl;
			})
			.catch((err) => {
				console.error(err);
				inflight.delete(src);
				return '';
			});

		inflight.set(src, promise);
	}
}

export function inlineAssetImages(root: ParentNode, cache: Map<string, string>): void {
	for (const img of Array.from(root.querySelectorAll('img'))) {
		const src = img.getAttribute('src') ?? '';
		if (!isAssetUrl(src)) continue;
		const dataUrl = cache.get(src);
		if (dataUrl) img.setAttribute('src', dataUrl);
	}
}

export function inliningClipboardSerializer(schema: Schema, cache: Map<string, string> = dataUrlCache): DOMSerializer {
	const base = DOMSerializer.fromSchema(schema);

	class InliningClipboardSerializer extends DOMSerializer {
		constructor(private readonly cache: Map<string, string>) {
			super(base.nodes, base.marks);
		}

		serializeFragment(
			fragment: Fragment,
			options?: { document?: Document },
			target?: HTMLElement | DocumentFragment
		): HTMLElement | DocumentFragment {
			const result = super.serializeFragment(fragment, options, target);
			if (result.nodeType === 1 || result.nodeType === 11) {
				inlineAssetImages(result as ParentNode, this.cache);
			}
			return result as HTMLElement | DocumentFragment;
		}
	}

	return new InliningClipboardSerializer(cache);
}
