const KEY = 'mynotes.sidebar';

// No stored choice yet: a narrow window keeps its width for the note itself.
function read(): boolean {
	const stored = localStorage.getItem(KEY);
	return stored === null ? window.innerWidth >= 1100 : stored === '1';
}

class Sidebar {
	open = $state<boolean>(read());

	toggle(): void {
		this.open = !this.open;
		localStorage.setItem(KEY, this.open ? '1' : '0');
	}
}

export const sidebar = new Sidebar();
