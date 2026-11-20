import { tick } from 'svelte';
import {
	createNote,
	trashNote,
	renameNote,
	setPinned,
	setLocked,
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
	focus(): void;
}

class Workspace {
	current = $state<Tab | null>(null);
	notes = $state<NoteMeta[]>([]);
	// Raw so editors can compare their own object by identity when unregistering.
	actions = $state.raw<NoteActions | null>(null);
	toast = $state<string | null>(null);
	private suppressPersist = false;
	private toastTimer: number | undefined;

	get activeId(): number | null {
		return this.current?.id ?? null;
	}

	get active(): Tab | undefined {
		return this.current ?? undefined;
	}

	async restore(): Promise<void> {
		this.suppressPersist = true;
		try {
			const session = await getSession();
			const notes = await listNotes();
			this.notes = notes;
			const firstOpen = session.open_tabs[0];
			const activeId =
				session.active_tab !== null && notes.some((n) => n.id === session.active_tab)
					? session.active_tab
					: firstOpen !== undefined && notes.some((n) => n.id === firstOpen)
						? firstOpen
						: null;
			const note = activeId === null ? undefined : notes.find((n) => n.id === activeId);
			this.current = note ? { id: note.id, kind: note.kind, title: note.title, empty: false } : null;
		} catch (err) {
			console.error(err);
		} finally {
			this.suppressPersist = false;
		}
	}

	async newNote(kind: Kind): Promise<void> {
		try {
			await this.leave();
			const note = await createNote(kind);
			this.current = { id: note.id, kind: note.kind, title: '', empty: true };
			this.persist();
			void this.refreshNotes();
		} catch (err) {
			console.error(err);
		}
	}

	async open(meta: NoteMeta): Promise<void> {
		if (this.current?.id === meta.id) return;
		await this.leave();
		this.current = { id: meta.id, kind: meta.kind, title: meta.title, empty: false };
		this.persist();
		void this.refreshNotes();
	}

	async close(): Promise<void> {
		if (this.current?.empty) {
			await this.leave();
		} else {
			this.current = null;
		}
		this.persist();
		void this.refreshNotes();
	}

	async cycle(step: 1 | -1): Promise<void> {
		if (this.notes.length === 0) return;
		const currentId = this.current?.id ?? null;
		const index = currentId === null ? -1 : this.notes.findIndex((n) => n.id === currentId);
		const nextIndex =
			index === -1 ? (step === 1 ? 0 : this.notes.length - 1) : (index + step + this.notes.length) % this.notes.length;
		const meta = this.notes[nextIndex];
		if (meta) await this.open(meta);
	}

	async openFile(): Promise<void> {
		try {
			const file = await openTextFile();
			if (!file) return;
			const { json, text } = importedDoc(file);
			await this.leave();
			const note = await createNote('doc');
			const title = titleFrom(text) || file.name;
			await saveNote(note.id, title, JSON.stringify(json), text);
			this.current = { id: note.id, kind: 'doc', title, empty: false };
			this.persist();
			void this.refreshNotes();
		} catch (err) {
			console.error(err);
			this.notify(String(err));
		}
	}

	async trashActive(): Promise<void> {
		if (this.current) await this.trash(this.current.id);
	}

	async trash(id: number): Promise<void> {
		if (this.notes.find((n) => n.id === id)?.locked) {
			this.notify('Unlock the note to move it to the trash');
			return;
		}
		if (this.current?.id === id) {
			this.current = null;
			this.persist();
			await tick();
		}
		try {
			await trashNote(id);
			this.notify('Moved to trash');
		} catch (err) {
			console.error(err);
			this.notify('Move to trash failed');
		}
		void this.refreshNotes();
	}

	async pin(id: number, pinned: boolean): Promise<void> {
		try {
			await setPinned(id, pinned);
		} catch (err) {
			console.error(err);
			this.notify(pinned ? 'Pin failed' : 'Unpin failed');
		}
		void this.refreshNotes();
	}

	async lock(id: number, locked: boolean): Promise<void> {
		try {
			await setLocked(id, locked);
		} catch (err) {
			console.error(err);
			this.notify(locked ? 'Lock failed' : 'Unlock failed');
		}
		void this.refreshNotes();
	}

	async restoreFromTrash(meta: NoteMeta): Promise<void> {
		try {
			await restoreNote(meta.id);
			await this.open(meta);
			void this.refreshNotes();
		} catch (err) {
			console.error(err);
			this.notify('Restore failed');
		}
	}

	// Not persisted: the session holds only ids, and this runs on every keystroke.
	update(id: number, patch: { title?: string; empty?: boolean }): void {
		const meta = this.notes.find((n) => n.id === id);
		// Editors report the title derived from content; a renamed note keeps its own.
		const { title, ...rest } = patch;
		const keepTitle = title !== undefined && !meta?.renamed;
		const current = this.current;
		if (current && current.id === id) Object.assign(current, keepTitle ? patch : rest);
		if (meta && keepTitle) meta.title = title;
	}

	async rename(id: number, title: string): Promise<void> {
		try {
			const effective = await renameNote(id, title);
			const current = this.current;
			if (current && current.id === id) {
				current.title = effective;
				// A renamed note is no longer the untouched draft that leaving would erase.
				current.empty = false;
			}
			await this.refreshNotes();
		} catch (err) {
			console.error(err);
			this.notify('Rename failed');
		}
	}

	// Saves are not routed through here, so the list is re-read when the user switches
	// notes or changes the set of notes; titles follow live through update().
	async refreshNotes(): Promise<void> {
		try {
			this.notes = await listNotes();
		} catch (err) {
			console.error(err);
		}
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

	private async leave(): Promise<void> {
		const tab = this.current;
		if (!tab || !tab.empty) return;
		this.current = null;
		await tick();
		try {
			// An untouched note is erased outright; only notes with content go to the trash.
			await trashNote(tab.id);
			await purgeNote(tab.id);
		} catch (err) {
			console.error(err);
		}
	}

	private persist(): void {
		if (this.suppressPersist) return;
		setSession({ open_tabs: this.current ? [this.current.id] : [], active_tab: this.current?.id ?? null }).catch((err) =>
			console.error(err)
		);
	}
}

export const workspace = new Workspace();
