import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { workspace } from './workspace.svelte';

const KEY = 'mynotes.noAutoUpdate';

function readAuto(): boolean {
	return localStorage.getItem(KEY) !== '1';
}

class Updates {
	auto = $state<boolean>(readAuto());
	available = $state<{ version: string; installed: boolean } | null>(null);
	installing = $state(false);

	toggleAuto(): void {
		this.auto = !this.auto;
		if (this.auto) localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, '1');
	}

	start(): void {
		if (this.auto) window.setTimeout(() => this.check(), 5000);
	}

	async check(): Promise<void> {
		try {
			this.available = await invoke<{ version: string; installed: boolean } | null>('check_update');
		} catch (err) {
			console.error(err);
		}
	}

	async install(): Promise<void> {
		if (this.available === null || this.installing) return;

		if (!this.available.installed) {
			openUrl('https://github.com/ikarys/mynotes/releases/latest').catch((err) => console.error(err));
			return;
		}

		this.installing = true;
		try {
			await invoke('install_update');
		} catch (err) {
			console.error(err);
			workspace.notify('Update failed');
		} finally {
			this.installing = false;
		}
	}
}

export const updates = new Updates();
