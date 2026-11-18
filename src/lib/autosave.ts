export interface Autosave {
	schedule(): void;
	flush(): Promise<void>;
	cancel(): void;
	readonly pending: boolean;
}

export function createAutosave(save: () => Promise<void>, delayMs = 400): Autosave {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let inFlight: Promise<void> | null = null;
	let pending = false;

	async function runSave(): Promise<void> {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}

		const previous = inFlight;
		const next = (async () => {
			if (previous) await previous;
			try {
				await save();
			} catch (err) {
				console.error(err);
			}
		})();

		inFlight = next;
		try {
			await next;
		} finally {
			if (inFlight === next) inFlight = null;
			if (timer === null && inFlight === null) pending = false;
		}
	}

	function schedule(): void {
		pending = true;
		if (timer !== null) clearTimeout(timer);
		timer = setTimeout(() => {
			void runSave();
		}, delayMs);
	}

	async function flush(): Promise<void> {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
			return runSave();
		}
		if (inFlight !== null) return inFlight;
		return Promise.resolve();
	}

	function cancel(): void {
		if (timer !== null) {
			clearTimeout(timer);
			timer = null;
		}
		if (inFlight === null) pending = false;
	}

	return {
		schedule,
		flush,
		cancel,
		get pending() {
			return pending;
		}
	};
}
