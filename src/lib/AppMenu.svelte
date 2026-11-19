<script lang="ts">
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Copy from '@lucide/svelte/icons/copy';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Save from '@lucide/svelte/icons/save';
	import ImageDown from '@lucide/svelte/icons/image-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import HardDrive from '@lucide/svelte/icons/hard-drive';
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Pin from '@lucide/svelte/icons/pin';
	import Info from '@lucide/svelte/icons/info';
	import Check from '@lucide/svelte/icons/check';
	import { workspace } from './workspace.svelte';
	import { theme, type ThemeMode } from './theme.svelte';
	import { typography, FONTS, MIN_SIZE, MAX_SIZE } from './typography.svelte';
	import { ontop } from './ontop.svelte';
	import { getHotkey, setHotkey, suspendHotkey, resumeHotkey, openDataDir } from './api';
	import TrashDialog from './TrashDialog.svelte';
	import AboutDialog from './AboutDialog.svelte';

	let menu: HTMLDivElement | undefined = $state();
	let shortcutButton: HTMLButtonElement | undefined = $state();
	let hotkey: string = $state('');
	let recording: boolean = $state(false);
	let trashDialog: TrashDialog | undefined = $state();
	let aboutDialog: AboutDialog | undefined = $state();

	const modes: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ mode: 'system', label: 'System', icon: Monitor },
		{ mode: 'light', label: 'Light', icon: Sun },
		{ mode: 'dark', label: 'Dark', icon: Moon }
	];

	function run(action: (() => Promise<void>) | undefined): void {
		menu?.hidePopover();
		action?.().catch((err) => console.error(err));
	}

	function openTrash(): void {
		menu?.hidePopover();
		void trashDialog?.show().catch((err) => console.error(err));
	}

	function openAbout(): void {
		menu?.hidePopover();
		aboutDialog?.show();
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

	function loadHotkey(event: ToggleEvent): void {
		if (event.newState !== 'open') return;
		getHotkey()
			.then((value) => {
				hotkey = value;
			})
			.catch((err) => {
				console.error(err);
				workspace.notify('Could not read the shortcut');
			});
	}

	function handleShortcutKey(event: KeyboardEvent): void {
		if (!recording) return;
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

<button class="tool" popovertarget="app-menu" aria-label="More" title="More">
	<Ellipsis size={16} />
</button>

<div id="app-menu" class="menu" popover bind:this={menu} ontoggle={loadHotkey}>
	<button class="item" onclick={() => run(() => workspace.openFile())}>
		<FolderOpen size={16} /> Open file… <kbd>Ctrl+O</kbd>
	</button>
	{#if workspace.actions}
		{@const actions = workspace.actions}
		<button class="item" onclick={() => run(actions.copyMarkdown)}>
			<Copy size={16} /> Copy as Markdown <kbd>Ctrl+Shift+C</kbd>
		</button>
		<button class="item" onclick={() => run(actions.saveAs)}>
			<Save size={16} /> Save as… <kbd>Ctrl+Shift+S</kbd>
		</button>
		{#if actions.exportPng}
			<button class="item" onclick={() => run(actions.exportPng)}>
				<ImageDown size={16} /> Export as PNG…
			</button>
		{/if}
		{#if workspace.active}
			<button class="item danger" onclick={() => run(() => workspace.trashActive())}>
				<Trash2 size={16} /> Move to trash
			</button>
		{/if}
		<div class="menu-sep"></div>
	{/if}
	<div class="menu-label" id="theme-label">Theme</div>
	<div class="segmented" role="radiogroup" aria-labelledby="theme-label">
		{#each modes as m (m.mode)}
			<button
				role="radio"
				aria-checked={theme.mode === m.mode}
				title={m.label}
				onclick={() => theme.set(m.mode)}
			>
				<m.icon size={14} />
				{m.label}
			</button>
		{/each}
	</div>
	<div class="menu-label" id="text-label">Note text</div>
	<div class="stepper" role="group" aria-labelledby="text-label">
		<select
			aria-label="Font"
			value={typography.font}
			onchange={(event) => typography.setFont(event.currentTarget.value)}
		>
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
	<div class="menu-sep"></div>
	<div class="menu-label">Show/hide shortcut</div>
	<button
		class="item"
		bind:this={shortcutButton}
		onclick={startRecording}
		onkeydown={handleShortcutKey}
		onblur={stopRecording}
	>
		<Keyboard size={16} />
		{#if recording}
			Press a shortcut…
		{:else}
			<kbd>{hotkey}</kbd>
		{/if}
	</button>
	<div class="menu-sep"></div>
	<button class="item" onclick={() => run(openDataDir)}>
		<HardDrive size={16} /> Open data folder
	</button>
	<button class="item" onclick={openTrash}>
		<ArchiveRestore size={16} /> Trash
	</button>
	<button class="item" role="menuitemcheckbox" aria-checked={ontop.enabled} onclick={() => ontop.toggle()}>
		<Pin size={16} /> Always on top
		{#if ontop.enabled}<Check size={16} class="item-check" />{/if}
	</button>
	<button class="item" onclick={openAbout}>
		<Info size={16} /> About mynotes
	</button>
</div>

<TrashDialog bind:this={trashDialog} />
<AboutDialog bind:this={aboutDialog} />
