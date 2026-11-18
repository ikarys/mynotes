import { tick } from 'svelte';
import { createNote, deleteNote, getSession, listNotes, setSession, type Kind, type NoteMeta } from './api';

export interface Tab {
	id: number;
	kind: Kind;
	title: string;
	empty: boolean;
}

class Workspace {
	tabs = $state<Tab[]>([]);
	activeId = $state<number | null>(null);
	private suppressPersist = false;

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
				if (note) {
					tabs.push({ id: note.id, kind: note.kind, title: note.title, empty: false });
				}
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
		const index = this.tabs.findIndex((tab) => tab.id === id);
		if (index === -1) return;

		const wasEmpty = this.tabs[index]?.empty ?? false;
		const remaining = this.tabs.filter((tab) => tab.id !== id);

		this.tabs = remaining;
		const neighbour = remaining[index] ?? remaining[index - 1] ?? null;
		this.activeId = neighbour?.id ?? null;
		this.persist();

		await tick();

		if (wasEmpty) {
			try {
				await deleteNote(id);
			} catch (err) {
				console.error(err);
			}
		}
	}

	// Not persisted: the session holds only ids, and this runs on every keystroke.
	update(id: number, patch: { title?: string; empty?: boolean }): void {
		const tab = this.tabs.find((t) => t.id === id);
		if (tab) Object.assign(tab, patch);
	}

	private persist(): void {
		if (this.suppressPersist) return;
		setSession({
			open_tabs: this.tabs.map((tab) => tab.id),
			active_tab: this.activeId
		}).catch((err) => console.error(err));
	}
}

export const workspace = new Workspace();
