<script lang="ts">
	import X from '@lucide/svelte/icons/x';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
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
	<header class="settings-head">
		<h2 class="sheet-title">Settings</h2>
		<button class="tool" aria-label="Close" title="Close (Esc)" onclick={() => dialog?.close()}>
			<X size={16} />
		</button>
	</header>

	<div class="settings-body">
		<section class="settings-group" aria-labelledby="set-appearance">
			<h3 class="settings-group-title" id="set-appearance">Appearance</h3>
			<div class="settings-card">
				<div class="settings-row">
					<div class="settings-text">
						<div class="settings-label">Theme</div>
					</div>
					<div class="segmented" role="radiogroup" aria-label="Theme">
						{#each modes as m (m.mode)}
							<button role="radio" aria-checked={theme.mode === m.mode} title={m.label} onclick={() => theme.set(m.mode)}>
								<m.icon size={14} />
								{m.label}
							</button>
						{/each}
					</div>
				</div>

				<div class="settings-row">
					<div class="settings-text">
						<div class="settings-label" id="set-font">Font</div>
						<div class="settings-hint" id="set-font-hint">For the text of your notes</div>
					</div>
					<select
						class="settings-select"
						aria-label="Font"
						aria-describedby="set-font-hint"
						value={typography.font}
						onchange={(event) => typography.setFont(event.currentTarget.value)}
					>
						{#each FONTS as font (font.id)}
							<option value={font.id}>{font.label}</option>
						{/each}
					</select>
				</div>

				<div class="settings-row">
					<div class="settings-text">
						<div class="settings-label">Text size</div>
					</div>
					<div class="stepper" role="group" aria-label="Text size">
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
				</div>

				<div class="settings-preview" aria-hidden="true">
					Saturday: eggs, coffee, call the plumber before noon.
				</div>
			</div>
		</section>

		<section class="settings-group" aria-labelledby="set-keyboard">
			<h3 class="settings-group-title" id="set-keyboard">Keyboard</h3>
			<div class="settings-card">
				<div class="settings-row">
					<div class="settings-text">
						<div class="settings-label" id="set-shortcut">Show or hide mynotes</div>
						<div class="settings-hint" id="set-shortcut-hint">Works from any app. Click, then press the new keys.</div>
					</div>
					<button
						class="settings-key"
						class:recording={recording}
						aria-labelledby="set-shortcut"
						aria-describedby="set-shortcut-hint"
						bind:this={shortcutButton}
						onclick={startRecording}
						onkeydown={handleShortcutKey}
						onblur={stopRecording}
					>
						{#if recording}
							Press keys…
						{:else}
							<kbd>{hotkey}</kbd>
						{/if}
					</button>
				</div>
			</div>
		</section>

		<section class="settings-group" aria-labelledby="set-updates">
			<h3 class="settings-group-title" id="set-updates">Updates and data</h3>
			<div class="settings-card">
				<div class="settings-row">
					<div class="settings-text">
						<div class="settings-label" id="set-updates-check">Check for updates at start</div>
						<div class="settings-hint" id="set-updates-check-hint">The only time mynotes goes online.</div>
					</div>
					<input
						type="checkbox"
						role="switch"
						class="switch"
						checked={updates.auto}
						onchange={() => updates.toggleAuto()}
						aria-labelledby="set-updates-check"
						aria-describedby="set-updates-check-hint"
					/>
				</div>

				<div class="settings-row">
					<div class="settings-text">
						<div class="settings-label" id="set-data-folder">Data folder</div>
						<div class="settings-hint" id="set-data-folder-hint">Your notes stay on this PC.</div>
					</div>
					<button class="settings-button" aria-describedby="set-data-folder-hint" onclick={() => openDataDir().catch((err) => console.error(err))}>
						<FolderOpen size={14} />
						Open
					</button>
				</div>
			</div>
		</section>
	</div>
</dialog>
