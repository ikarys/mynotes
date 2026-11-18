export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'mynotes.theme';

function read(): ThemeMode {
	const value = localStorage.getItem(KEY);
	return value === 'light' || value === 'dark' ? value : 'system';
}

class Theme {
	mode = $state<ThemeMode>(read());

	constructor() {
		this.apply();
	}

	set(mode: ThemeMode): void {
		this.mode = mode;
		if (mode === 'system') localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, mode);
		this.apply();
	}

	// No attribute for "system": the CSS media query then follows Windows live.
	private apply(): void {
		const root = document.documentElement;
		if (this.mode === 'system') delete root.dataset.theme;
		else root.dataset.theme = this.mode;
	}
}

export const theme = new Theme();
