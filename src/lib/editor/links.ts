import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { openUrl } from '@tauri-apps/plugin-opener';

export function safeHref(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;

	const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

	try {
		const url = new URL(candidate);
		if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
			return url.toString();
		}
		return null;
	} catch {
		return null;
	}
}

export const LinkClick = Extension.create({
	name: 'linkClick',
	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey('linkClick'),
				props: {
					handleClick(_view, _pos, event: MouseEvent): boolean {
						if (!event.ctrlKey || !(event.target instanceof Element)) return false;
						const href = event.target.closest('a[href]')?.getAttribute('href');
						const safe = href ? safeHref(href) : null;
						if (!safe) return false;
						openUrl(safe).catch((err) => console.error(err));
						return true;
					}
				}
			})
		];
	}
});
