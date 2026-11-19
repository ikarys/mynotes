import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';
import { Extension } from '@tiptap/core';

export interface FindMatch {
	from: number;
	to: number;
}

export interface FindPluginState {
	query: string;
	caseSensitive: boolean;
	matches: FindMatch[];
	current: number;
}

interface FindMeta {
	query?: string;
	caseSensitive?: boolean;
	current?: number;
}

export const findReplaceKey = new PluginKey<FindPluginState>('findReplace');

export function findMatches(doc: Node, query: string, caseSensitive = false): FindMatch[] {
	if (!query) return [];

	const matches: FindMatch[] = [];

	doc.descendants((node, pos) => {
		if (!node.isTextblock) return;

		const text = node.textBetween(0, node.content.size, undefined, '￼');
		const haystack = caseSensitive ? text : text.toLowerCase();
		const needle = caseSensitive ? query : query.toLowerCase();

		if (!needle || needle.length > haystack.length) return;

		let index = haystack.indexOf(needle);
		while (index !== -1) {
			matches.push({
				from: pos + 1 + index,
				to: pos + 1 + index + needle.length
			});
			index = haystack.indexOf(needle, index + needle.length);
		}

		return false;
	});

	return matches;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		findReplace: {
			setFindQuery: (query: string, caseSensitive?: boolean) => ReturnType;
			findNext: () => ReturnType;
			findPrevious: () => ReturnType;
			replaceCurrent: (text: string) => ReturnType;
			replaceAll: (text: string) => ReturnType;
		};
	}
}

export const FindReplace = Extension.create<{ onOpen: (replace: boolean) => void }>({
	name: 'findReplace',

	addOptions() {
		return {
			onOpen: () => {}
		};
	},

	addProseMirrorPlugins() {
		return [
			new Plugin<FindPluginState>({
				key: findReplaceKey,

				state: {
				init: () => ({
					query: '',
					caseSensitive: false,
					matches: [],
					current: -1
				}),

				apply(tr: Transaction, value: FindPluginState, _oldState: EditorState, state: EditorState) {
					const meta = tr.getMeta(findReplaceKey) as FindMeta | undefined;

					let query = value.query;
					let caseSensitive = value.caseSensitive;
					let current = typeof meta?.current === 'number' ? meta.current : value.current;

					if (meta) {
						if (typeof meta.query === 'string') query = meta.query;
						if (typeof meta.caseSensitive === 'boolean') caseSensitive = meta.caseSensitive;
					}

					let matches = value.matches;
					if (tr.docChanged || (meta && (meta.query !== undefined || meta.caseSensitive !== undefined))) {
						matches = findMatches(state.doc, query, caseSensitive);
					}

					if (current < 0) {
						current = matches.length ? 0 : -1;
					} else if (current >= matches.length) {
						current = matches.length ? matches.length - 1 : -1;
					}

					return { query, caseSensitive, matches, current };
				}
				},

				props: {
					decorations(state: EditorState) {
						const value = findReplaceKey.getState(state);
						if (!value || !value.query) return DecorationSet.empty;

						return DecorationSet.create(
							state.doc,
							value.matches.map((match, index) =>
								Decoration.inline(match.from, match.to, {
									class: index === value.current ? 'find-match find-current' : 'find-match'
								})
							)
						);
					}
				}
			})
		];
	},

	addCommands() {
		return {
			setFindQuery: (query: string, caseSensitive?: boolean) => ({ state, tr, dispatch }) => {
				const current = findState(state);
				const sensitive = caseSensitive ?? current.caseSensitive;
				const matches = findMatches(state.doc, query, sensitive);

				let next = -1;
				if (matches.length) {
					const after = matches.findIndex((match) => match.from >= state.selection.from);
					next = after === -1 ? 0 : after;
				}

				const transaction = tr.setMeta(findReplaceKey, {
					query,
					caseSensitive: sensitive,
					current: next
				});

				dispatch?.(transaction);
				return true;
			},

			findNext: () => ({ state, tr, dispatch }) => {
				const value = findState(state);
				if (!value.query || value.matches.length === 0) return true;

				const next = value.current < 0 ? 0 : (value.current + 1) % value.matches.length;
				const match = value.matches[next];
				const selection = TextSelection.create(state.doc, match.from, match.to);

				const transaction = tr
					.setSelection(selection)
					.scrollIntoView()
					.setMeta(findReplaceKey, { current: next });

				dispatch?.(transaction);
				return true;
			},

			findPrevious: () => ({ state, tr, dispatch }) => {
				const value = findState(state);
				if (!value.query || value.matches.length === 0) return true;

				const prev =
					value.current < 0
						? value.matches.length - 1
						: (value.current - 1 + value.matches.length) % value.matches.length;
				const match = value.matches[prev];
				const selection = TextSelection.create(state.doc, match.from, match.to);

				const transaction = tr
					.setSelection(selection)
					.scrollIntoView()
					.setMeta(findReplaceKey, { current: prev });

				dispatch?.(transaction);
				return true;
			},

			replaceCurrent: (text: string) => ({ state, tr, dispatch }) => {
				const value = findState(state);
				const match = value.current >= 0 ? value.matches[value.current] : undefined;
				if (!match) return true;

				tr.insertText(text, match.from, match.to);
				// The next match is the first one after the inserted text, so a replacement
				// that contains the query is not matched again.
				const end = match.from + text.length;
				const after = findMatches(tr.doc, value.query, value.caseSensitive).findIndex((m) => m.from >= end);
				const transaction = tr.setMeta(findReplaceKey, { current: Math.max(after, 0) });

				dispatch?.(transaction);
				return true;
			},

			replaceAll: (text: string) => ({ state, tr, dispatch }) => {
				const value = findState(state);
				if (!value.query || value.matches.length === 0) return true;

				let transaction = tr;
				for (let i = value.matches.length - 1; i >= 0; i--) {
					const match = value.matches[i];
					transaction = transaction.insertText(text, match.from, match.to);
				}

				transaction = transaction.setMeta(findReplaceKey, { current: 0 });
				dispatch?.(transaction);
				return true;
			}
		};
	},

	addKeyboardShortcuts() {
		return {
			'Mod-f': () => {
				this.options.onOpen(false);
				return true;
			},
			'Mod-h': () => {
				this.options.onOpen(true);
				return true;
			}
		};
	}
});

export function findState(state: EditorState): FindPluginState {
	return findReplaceKey.getState(state) ?? { query: '', caseSensitive: false, matches: [], current: -1 };
}
