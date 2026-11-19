import { invoke } from '@tauri-apps/api/core';

export type Kind = 'doc' | 'mindmap';

export interface NoteMeta {
	id: number;
	kind: Kind;
	title: string;
	updated_at: number;
}

export interface Note extends NoteMeta {
	content: string;
}

export interface Session {
	open_tabs: number[];
	active_tab: number | null;
}

export async function listNotes(): Promise<NoteMeta[]> {
	return invoke<NoteMeta[]>('list_notes');
}

export async function loadNote(id: number): Promise<Note | null> {
	return invoke<Note | null>('load_note', { id });
}

export async function createNote(kind: Kind): Promise<Note> {
	return invoke<Note>('create_note', { kind });
}

export async function saveNote(id: number, title: string, content: string, text: string): Promise<void> {
	await invoke('save_note', { id, title, content, text });
}

export async function deleteNote(id: number): Promise<void> {
	await invoke('delete_note', { id });
}

export async function search(query: string): Promise<NoteMeta[]> {
	return invoke<NoteMeta[]>('search', { query });
}

export async function getSession(): Promise<Session> {
	return invoke<Session>('get_session');
}

export async function setSession(session: Session): Promise<void> {
	await invoke('set_session', { session });
}

export async function appReady(): Promise<void> {
	await invoke('app_ready');
}

export async function getHotkey(): Promise<string> {
	return invoke<string>('get_hotkey');
}

export async function setHotkey(hotkey: string): Promise<string> {
	return invoke<string>('set_hotkey', { hotkey });
}
