<script lang="ts">
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import { workspace } from './workspace.svelte';
	import { theme, type ThemeMode } from './theme.svelte';
	import { typography, FONTS, MIN_SIZE, MAX_SIZE } from './typography.svelte';
	import { updates } from './updates.svelte';
	import { getHotkey, setHotkey, suspendHotkey, resumeHotkey, openDataDir } from './api';

	let dialog: HTMLDialogElement | undefined = $state();
	let shortcutButton: HTMLButtonElement | undefined = $state();
	let hotkey: string = $state('');
	let recording: boolean = $state(false);

	const modes: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ mode: 'system', label: 'System', icon: Monitor },
		{ mode: 'light', label: 'Light', icon: Sun },
		{ mode: 'dark', label: 'Dark', icon: Moon }
	];

	export function show(): void {
		dialog?.showModal();
		getHotkey()
			.then((value) => {
				hotkey = value;
			})
			.catch((err) => {
				console.error(err);
				workspace.notify('Could not read the shortcut');
			});
	}

	function startRecording(): void {
		if (recording) return;
		recording = true;
		shortcutButton?.focus();
		suspendHotkey().catch((err) => console.error(err));
	}

	function stopRecording(): void {
		if (!recording) return;
		recording = false;
		resumeHotkey().catch((err) => workspace.notify(String(err)));
	}

	function handleShortcutKey(event: KeyboardEvent): void {
		if (!recording) return;
		// Also keeps Escape from closing the dialog while a shortcut is recorded.
		event.preventDefault();
		event.stopPropagation();

		if (event.key === 'Escape') {
			stopRecording();
			return;
		}

		if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
			return;
		}

		const parts: string[] = [];
		if (event.ctrlKey) parts.push('Ctrl');
		if (event.altKey) parts.push('Alt');
		if (event.shiftKey) parts.push('Shift');
		if (event.metaKey) parts.push('Super');

		let key = event.code;
		if (key.startsWith('Key')) {
			key = key.slice(3);
		} else if (key.startsWith('Digit')) {
			key = key.slice(5);
		}

		if (parts.length === 0) {
			workspace.notify('The shortcut needs Ctrl, Alt, Shift or Win');
			return;
		}

		parts.push(key);
		setHotkey(parts.join('+'))
			.then((value) => {
				hotkey = value;
				stopRecording();
			})
			.catch((err) => {
				workspace.notify(String(err));
				stopRecording();
			});
	}
</script>

<dialog class="sheet settings" bind:this={dialog} onclose={stopRecording}>
	<h2 class="sheet-title">Settings</h2>

	<section>
		<h3 class="menu-label" id="theme-label">Theme</h3>
		<div class="segmented" role="radiogroup" aria-labelledby="theme-label">
			{#each modes as m (m.mode)}
				<button role="radio" aria-checked={theme.mode === m.mode} title={m.label} onclick={() => theme.set(m.mode)}>
					<m.icon size={14} />
					{m.label}
				</button>
			{/each}
		</div>
	</section>

	<section>
		<h3 class="menu-label" id="text-label">Note text</h3>
		<div class="stepper" role="group" aria-labelledby="text-label">
			<select aria-label="Font" value={typography.font} onchange={(event) => typography.setFont(event.currentTarget.value)}>
				{#each FONTS as font (font.id)}
					<option value={font.id}>{font.label}</option>
				{/each}
			</select>
			<button
				aria-label="Smaller text"
				disabled={typography.size <= MIN_SIZE}
				onclick={() => typography.setSize(typography.size - 1)}>−</button
			>
			<output aria-label="Text size">{typography.size}px</output>
			<button
				aria-label="Larger text"
				disabled={typography.size >= MAX_SIZE}
				onclick={() => typography.setSize(typography.size + 1)}>+</button
			>
		</div>
	</section>

	<section>
		<h3 class="menu-label" id="shortcut-label">Show/hide shortcut</h3>
		<button
			class="sheet-btn setting-control"
			aria-labelledby="shortcut-label"
			bind:this={shortcutButton}
			onclick={startRecording}
			onkeydown={handleShortcutKey}
			onblur={stopRecording}
		>
			<Keyboard size={14} />
			{#if recording}
				Press a shortcut…
			{:else}
				<kbd>{hotkey}</kbd>
			{/if}
		</button>
	</section>

	<section>
		<h3 class="menu-label">Updates</h3>
		<label class="setting-check">
			<input type="checkbox" checked={updates.auto} onchange={() => updates.toggleAuto()} />
			Check for updates at start
		</label>
	</section>

	<section>
		<h3 class="menu-label">Data</h3>
		<button class="sheet-btn setting-control" onclick={() => openDataDir().catch((err) => console.error(err))}>
			<HardDrive size={14} /> Open data folder
		</button>
	</section>

	<div class="sheet-footer">
		<button class="sheet-btn" onclick={() => dialog?.close()}>Close</button>
	</div>
</dialog>
