import { getCurrentWindow } from '@tauri-apps/api/window';

const KEY = 'mynotes.onTop';

function read(): boolean {
	return localStorage.getItem(KEY) === '1';
}

class OnTop {
	enabled = $state<boolean>(read());

	constructor() {
		this.apply();
	}

	toggle(): void {
		this.enabled = !this.enabled;
		if (this.enabled) localStorage.setItem(KEY, '1');
		else localStorage.removeItem(KEY);
		this.apply();
	}

	private apply(): void {
		getCurrentWindow()
			.setAlwaysOnTop(this.enabled)
			.catch((err) => console.error(err));
	}
}

export const ontop = new OnTop();
