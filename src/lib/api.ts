import { invoke } from '@tauri-apps/api/core';

export type Kind = 'doc' | 'mindmap';

export interface NoteMeta {
	id: number;
	kind: Kind;
	title: string;
	updated_at: number;
	renamed: boolean;
	pinned: boolean;
	locked: boolean;
}

export interface Note extends NoteMeta {
	content: string;
}

export interface Session {
	open_tabs: number[];
	active_tab: number | null;
}

export interface OpenedFile {
	name: string;
	markdown: boolean;
	text: string;
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

export async function renameNote(id: number, title: string): Promise<string> {
	return invoke<string>('rename_note', { id, title });
}

export async function setPinned(id: number, pinned: boolean): Promise<void> {
	await invoke('set_pinned', { id, pinned });
}

export async function setLocked(id: number, locked: boolean): Promise<void> {
	await invoke('set_locked', { id, locked });
}

export async function trashNote(id: number): Promise<void> {
	await invoke('trash_note', { id });
}

export async function purgeNote(id: number): Promise<void> {
	await invoke('purge_note', { id });
}

export async function listTrash(): Promise<NoteMeta[]> {
	return invoke<NoteMeta[]>('list_trash');
}

export async function restoreNote(id: number): Promise<void> {
	await invoke('restore_note', { id });
}

export async function emptyTrash(): Promise<void> {
	await invoke('empty_trash');
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

export async function suspendHotkey(): Promise<void> {
	return invoke<void>('suspend_hotkey');
}

export async function resumeHotkey(): Promise<void> {
	return invoke<void>('resume_hotkey');
}

export async function saveText(name: string, markdown: string, plain: string): Promise<boolean> {
	return invoke<boolean>('save_text', { name, markdown, plain });
}

export async function openTextFile(): Promise<OpenedFile | null> {
	return invoke<OpenedFile | null>('open_text_file');
}

export async function openDataDir(): Promise<void> {
	await invoke('open_data_dir');
}

export async function dataDirSize(): Promise<number> {
	return invoke<number>('data_dir_size');
}
