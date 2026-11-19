<script lang="ts">
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Copy from '@lucide/svelte/icons/copy';
	import FileDown from '@lucide/svelte/icons/file-down';
	import ImageDown from '@lucide/svelte/icons/image-down';
	import Keyboard from '@lucide/svelte/icons/keyboard';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { workspace } from './workspace.svelte';
	import { theme, type ThemeMode } from './theme.svelte';
	import { getHotkey, setHotkey } from './api';

	let menu: HTMLDivElement | undefined = $state();
	let shortcutButton: HTMLButtonElement | undefined = $state();
	let hotkey: string = $state('');
	let recording: boolean = $state(false);

	const modes: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ mode: 'system', label: 'System', icon: Monitor },
		{ mode: 'light', label: 'Light', icon: Sun },
		{ mode: 'dark', label: 'Dark', icon: Moon }
	];

	function run(action: (() => Promise<void>) | undefined): void {
		menu?.hidePopover();
		action?.().catch((err) => console.error(err));
	}

	function startRecording(): void {
		recording = true;
		shortcutButton?.focus();
	}

	function stopRecording(): void {
		recording = false;
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

	$effect(() => {
		getHotkey()
			.then((value) => {
				hotkey = value;
			})
			.catch((err) => console.error(err));
	});
</script>

<button class="tool" popovertarget="app-menu" aria-label="More" title="More">
	<Ellipsis size={16} />
</button>

<div id="app-menu" class="menu" popover bind:this={menu}>
	{#if workspace.actions}
		{@const actions = workspace.actions}
		<button class="item" onclick={() => run(actions.copyMarkdown)}>
			<Copy size={16} /> Copy as Markdown <kbd>Ctrl+Shift+C</kbd>
		</button>
		{#if actions.exportMarkdown}
			<button class="item" onclick={() => run(actions.exportMarkdown)}>
				<FileDown size={16} /> Export as Markdown…
			</button>
		{/if}
		{#if actions.exportPng}
			<button class="item" onclick={() => run(actions.exportPng)}>
				<ImageDown size={16} /> Export as PNG…
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
</div>
