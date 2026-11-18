<script lang="ts">
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Copy from '@lucide/svelte/icons/copy';
	import FileDown from '@lucide/svelte/icons/file-down';
	import ImageDown from '@lucide/svelte/icons/image-down';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import { workspace } from './workspace.svelte';
	import { theme, type ThemeMode } from './theme.svelte';

	let menu: HTMLDivElement | undefined = $state();

	const modes: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ mode: 'system', label: 'System', icon: Monitor },
		{ mode: 'light', label: 'Light', icon: Sun },
		{ mode: 'dark', label: 'Dark', icon: Moon }
	];

	function run(action: (() => Promise<void>) | undefined): void {
		menu?.hidePopover();
		action?.().catch((err) => console.error(err));
	}
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
</div>
