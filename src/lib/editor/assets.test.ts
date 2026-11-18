// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import {
	assetUrlToFileUrl,
	dataUrlCache,
	inlineAssetImages,
	inliningClipboardSerializer,
	isAssetUrl,
	rewriteMarkdownImages
} from './assets';
import { baseExtensions } from './extensions';

describe('isAssetUrl', () => {
	it('accepts asset urls', () => {
		expect(isAssetUrl('http://asset.localhost/C:/x.png')).toBe(true);
		expect(isAssetUrl('asset://localhost/C:/x.png')).toBe(true);
	});

	it('rejects other urls', () => {
		expect(isAssetUrl('https://example.com/x.png')).toBe(false);
		expect(isAssetUrl('data:image/png;base64,xx')).toBe(false);
	});
});

describe('assetUrlToFileUrl', () => {
	it('converts windows asset url to file url', () => {
		const src =
			'http://asset.localhost/' +
			encodeURIComponent('C:\\Users\\Me\\AppData\\Roaming\\ovh.iks-homelab.mynotes\\images\\ab.png');
		expect(assetUrlToFileUrl(src)).toBe(
			'file:///C:/Users/Me/AppData/Roaming/ovh.iks-homelab.mynotes/images/ab.png'
		);
	});

	it('encodes spaces', () => {
		const src = 'http://asset.localhost/' + encodeURIComponent('C:\\Users\\Me\\a b.png');
		expect(assetUrlToFileUrl(src)).toBe('file:///C:/Users/Me/a%20b.png');
	});

	it('leaves other urls unchanged', () => {
		expect(assetUrlToFileUrl('https://example.com/x.png')).toBe('https://example.com/x.png');
	});
});

describe('rewriteMarkdownImages', () => {
	it('rewrites asset targets only', () => {
		const asset = 'http://asset.localhost/' + encodeURIComponent('C:\\x.png');
		const md = `![a](${asset})\n![b](https://example.com/x.png)`;
		const out = rewriteMarkdownImages(md);
		expect(out).toContain('<file:///C:/x.png>');
		expect(out).toContain('![b](https://example.com/x.png)');
	});

	it('preserves title', () => {
		const asset = 'http://asset.localhost/' + encodeURIComponent('C:\\x.png');
		const out = rewriteMarkdownImages(`![a](${asset} "title")`);
		expect(out).toBe('![a]<file:///C:/x.png> "title"');
	});
});

describe('inlineAssetImages', () => {
	it('replaces only cached asset srcs', () => {
		const root = document.createElement('div');
		const img1 = document.createElement('img');
		const asset = 'http://asset.localhost/' + encodeURIComponent('C:\\x.png');
		img1.setAttribute('src', asset);
		const img2 = document.createElement('img');
		img2.setAttribute('src', 'https://example.com/x.png');
		root.append(img1, img2);

		const cache = new Map<string, string>([[asset, 'data:image/png;base64,xx']]);
		inlineAssetImages(root, cache);

		expect(img1.getAttribute('src')).toBe('data:image/png;base64,xx');
		expect(img2.getAttribute('src')).toBe('https://example.com/x.png');
	});
});

describe('inliningClipboardSerializer', () => {
	it('inlines cached asset images in serialized fragment', () => {
		const asset = 'http://asset.localhost/' + encodeURIComponent('C:\\x.png');
		const editor = new Editor({
			extensions: baseExtensions(),
			content: {
				type: 'doc',
				content: [{ type: 'image', attrs: { src: asset } }]
			}
		});

		const cache = new Map<string, string>([[asset, 'data:image/png;base64,xx']]);
		const serializer = inliningClipboardSerializer(editor.schema, cache);
		const node = serializer.serializeFragment(editor.state.doc.content);

		const img = (node as Element).querySelector('img');
		expect(img?.getAttribute('src')).toBe('data:image/png;base64,xx');
		editor.destroy();
	});
});

describe('dataUrlCache', () => {
	it('is a map', () => {
		expect(dataUrlCache instanceof Map).toBe(true);
	});
});
