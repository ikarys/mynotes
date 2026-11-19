import { tick } from 'svelte';
import {
	createNote,
	trashNote,
	purgeNote,
	restoreNote,
	getSession,
	listNotes,
	openTextFile,
	saveNote,
	setSession,
	type Kind,
	type NoteMeta
} from './api';
import { importedDoc } from './files';
import { titleFrom } from './text';

export interface Tab {
	id: number;
	kind: Kind;
	title: string;
	empty: boolean;
}

export interface NoteActions {
	copyMarkdown(): Promise<void>;
	saveAs(): Promise<void>;
	exportPng?(): Promise<void>;
}

class Workspace {
	tabs = $state<Tab[]>([]);
	activeId = $state<number | null>(null);
	// Raw so editors can compare their own object by identity when unregistering.
	actions = $state.raw<NoteActions | null>(null);
	toast = $state<string | null>(null);
	private suppressPersist = false;
	private toastTimer: number | undefined;

	get active(): Tab | undefined {
		return this.tabs.find((tab) => tab.id === this.activeId);
	}

	async restore(): Promise<void> {
		this.suppressPersist = true;
		try {
			const session = await getSession();
			const notes = await listNotes();
			const tabs: Tab[] = [];
			for (const id of session.open_tabs) {
				const note = notes.find((n) => n.id === id);
				if (note) tabs.push({ id: note.id, kind: note.kind, title: note.title, empty: false });
			}
			this.tabs = tabs;
			this.activeId =
				session.active_tab !== null && tabs.some((tab) => tab.id === session.active_tab)
					? session.active_tab
					: tabs[0]?.id ?? null;
		} catch (err) {
			console.error(err);
		} finally {
			this.suppressPersist = false;
		}
	}

	async newNote(kind: Kind): Promise<void> {
		try {
			const note = await createNote(kind);
			this.tabs = [...this.tabs, { id: note.id, kind: note.kind, title: '', empty: true }];
			this.activeId = note.id;
			this.persist();
		} catch (err) {
			console.error(err);
		}
	}

	open(meta: NoteMeta): void {
		const existing = this.tabs.find((tab) => tab.id === meta.id);
		if (existing) {
			this.activeId = meta.id;
		} else {
			this.tabs = [...this.tabs, { id: meta.id, kind: meta.kind, title: meta.title, empty: false }];
			this.activeId = meta.id;
		}
		this.persist();
	}

	activate(id: number): void {
		if (!this.tabs.some((tab) => tab.id === id)) return;
		this.activeId = id;
		this.persist();
	}

	moveTab(id: number, toIndex: number): void {
		const from = this.tabs.findIndex((tab) => tab.id === id);
		if (from === -1 || from === toIndex || toIndex < 0 || toIndex >= this.tabs.length) return;
		const tabs = [...this.tabs];
		const [tab] = tabs.splice(from, 1);
		tabs.splice(toIndex, 0, tab);
		this.tabs = tabs;
		this.persist();
	}

	cycle(step: 1 | -1): void {
		const length = this.tabs.length;
		if (length === 0) return;
		const index = this.tabs.findIndex((tab) => tab.id === this.activeId);
		const nextIndex = index === -1 ? (step === 1 ? 0 : length - 1) : (index + step + length) % length;
		const next = this.tabs[nextIndex];
		if (next) {
			this.activeId = next.id;
			this.persist();
		}
	}

	async close(id: number): Promise<void> {
		const tab = this.tabs.find((t) => t.id === id);
		if (!tab) return;
		const wasEmpty = tab.empty;
		this.removeTab(id);
		await tick();
		if (wasEmpty) {
			try {
				// An untouched note is erased outright; only notes with content go to the trash.
				await trashNote(id);
				await purgeNote(id);
			} catch (err) {
				console.error(err);
			}
		}
	}

	async openFile(): Promise<void> {
		try {
			const file = await openTextFile();
			if (!file) return;
			const { json, text } = importedDoc(file);
			const note = await createNote('doc');
			const title = titleFrom(text) || file.name;
			await saveNote(note.id, title, JSON.stringify(json), text);
			this.tabs = [...this.tabs, { id: note.id, kind: 'doc', title, empty: false }];
			this.activeId = note.id;
			this.persist();
		} catch (err) {
			console.error(err);
			this.notify(String(err));
		}
	}

	async trashActive(): Promise<void> {
		const tab = this.active;
		if (!tab) return;
		this.removeTab(tab.id);
		await tick();
		try {
			await trashNote(tab.id);
			this.notify('Moved to trash');
		} catch (err) {
			console.error(err);
			this.notify('Move to trash failed');
		}
	}

	async restoreFromTrash(meta: NoteMeta): Promise<void> {
		try {
			await restoreNote(meta.id);
			this.open(meta);
		} catch (err) {
			console.error(err);
			this.notify('Restore failed');
		}
	}

	// Not persisted: the session holds only ids, and this runs on every keystroke.
	update(id: number, patch: { title?: string; empty?: boolean }): void {
		const tab = this.tabs.find((t) => t.id === id);
		if (tab) Object.assign(tab, patch);
	}

	setActions(a: NoteActions | null): void {
		this.actions = a;
	}

	notify(message: string): void {
		this.toast = message;
		if (this.toastTimer !== undefined) clearTimeout(this.toastTimer);
		this.toastTimer = setTimeout(() => {
			this.toast = null;
			this.toastTimer = undefined;
		}, 1600);
	}

	private removeTab(id: number): void {
		const index = this.tabs.findIndex((tab) => tab.id === id);
		if (index === -1) return;
		const remaining = this.tabs.filter((tab) => tab.id !== id);
		this.tabs = remaining;
		const neighbour = remaining[index] ?? remaining[index - 1] ?? null;
		this.activeId = neighbour?.id ?? null;
		this.persist();
	}

	private persist(): void {
		if (this.suppressPersist) return;
		setSession({ open_tabs: this.tabs.map((tab) => tab.id), active_tab: this.activeId }).catch((err) =>
			console.error(err)
		);
	}
}

export const workspace = new Workspace();
