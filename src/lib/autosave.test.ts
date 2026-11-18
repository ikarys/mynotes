import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAutosave } from './autosave';

describe('createAutosave', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('coalesces several schedule calls into one save after 400 ms', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const autosave = createAutosave(save);

		autosave.schedule();
		autosave.schedule();
		autosave.schedule();

		expect(save).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(400);

		expect(save).toHaveBeenCalledTimes(1);
	});

	it('flush saves immediately and only when pending', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const autosave = createAutosave(save);

		expect(autosave.pending).toBe(false);
		await autosave.flush();
		expect(save).not.toHaveBeenCalled();

		autosave.schedule();
		expect(autosave.pending).toBe(true);

		await autosave.flush();

		expect(save).toHaveBeenCalledTimes(1);
		expect(autosave.pending).toBe(false);
	});

	it('cancel prevents the save', async () => {
		const save = vi.fn().mockResolvedValue(undefined);
		const autosave = createAutosave(save);

		autosave.schedule();
		autosave.cancel();

		expect(autosave.pending).toBe(false);

		await vi.advanceTimersByTimeAsync(400);

		expect(save).not.toHaveBeenCalled();
	});

	it('saves never overlap', async () => {
		let resolveSave: (() => void) | undefined;
		const save = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveSave = () => resolve();
				})
		);
		const autosave = createAutosave(save);

		autosave.schedule();
		await vi.advanceTimersByTimeAsync(400);

		expect(save).toHaveBeenCalledTimes(1);
		expect(autosave.pending).toBe(true);

		autosave.schedule();
		await vi.advanceTimersByTimeAsync(400);

		expect(save).toHaveBeenCalledTimes(1);

		resolveSave?.();
		await vi.advanceTimersByTimeAsync(0);

		expect(save).toHaveBeenCalledTimes(2);
		resolveSave?.();
		await vi.advanceTimersByTimeAsync(0);
		expect(autosave.pending).toBe(false);
	});
});
