export const FONTS: readonly { id: string; label: string; stack: string }[] = [
	{ id: 'system', label: 'Segoe UI', stack: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif" },
	{ id: 'serif', label: 'Georgia', stack: "Georgia, Cambria, 'Times New Roman', serif" },
	{ id: 'humanist', label: 'Calibri', stack: "Calibri, Candara, 'Segoe UI', sans-serif" },
	{ id: 'mono', label: 'Cascadia Mono', stack: "'Cascadia Mono', Consolas, monospace" }
];
export const MIN_SIZE = 11;
export const MAX_SIZE = 28;
export const DEFAULT_SIZE = 15;
export const DEFAULT_FONT = 'system';
const FONT_KEY = 'mynotes.font';
const SIZE_KEY = 'mynotes.fontSize';
export function parseFont(value: string | null): string {
	if (value !== null && FONTS.some((font) => font.id === value)) return value;
	return DEFAULT_FONT;
}
export function parseSize(value: string | null): number {
	if (value === null || !/^\d{1,3}$/.test(value)) return DEFAULT_SIZE;
	const parsed = Number(value);
	return Math.min(MAX_SIZE, Math.max(MIN_SIZE, parsed));
}
class Typography {
	font = $state<string>(parseFont(localStorage.getItem(FONT_KEY)));
	size = $state<number>(parseSize(localStorage.getItem(SIZE_KEY)));
	constructor() {
		this.apply();
	}
	setFont(id: string): void {
		this.font = parseFont(id);
		if (this.font === DEFAULT_FONT) localStorage.removeItem(FONT_KEY);
		else localStorage.setItem(FONT_KEY, this.font);
		this.apply();
	}
	setSize(px: number): void {
		const rounded = Math.round(px);
		this.size = Number.isNaN(rounded) ? DEFAULT_SIZE : Math.min(MAX_SIZE, Math.max(MIN_SIZE, rounded));
		if (this.size === DEFAULT_SIZE) localStorage.removeItem(SIZE_KEY);
		else localStorage.setItem(SIZE_KEY, String(this.size));
		this.apply();
	}
	private apply(): void {
		const font = FONTS.find((entry) => entry.id === this.font) ?? FONTS[0]!;
		document.documentElement.style.setProperty('--note-font', font.stack);
		document.documentElement.style.setProperty('--note-size', `${this.size}px`);
	}
}
export const typography = new Typography();
