<script lang="ts" module>
	// Entry points for the rail, which lives outside this component; the dialogs stay here.
	export const appMenu: { trash?: () => void; settings?: () => void } = {};
</script>

<script lang="ts">
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Copy from '@lucide/svelte/icons/copy';
	import FolderOpen from '@lucide/svelte/icons/folder-open';
	import Save from '@lucide/svelte/icons/save';
	import ImageDown from '@lucide/svelte/icons/image-down';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ArchiveRestore from '@lucide/svelte/icons/archive-restore';
	import Pin from '@lucide/svelte/icons/pin';
	import Info from '@lucide/svelte/icons/info';
	import Check from '@lucide/svelte/icons/check';
	import { workspace } from './workspace.svelte';
	import { ontop } from './ontop.svelte';
	import { updates } from './updates.svelte';
	import Download from '@lucide/svelte/icons/download';
	import TrashDialog from './TrashDialog.svelte';
	import AboutDialog from './AboutDialog.svelte';
	import SettingsDialog from './SettingsDialog.svelte';
	import Settings from '@lucide/svelte/icons/settings';

	let menu: HTMLDivElement | undefined = $state();
	let trashDialog: TrashDialog | undefined = $state();
	let aboutDialog: AboutDialog | undefined = $state();
	let settingsDialog: SettingsDialog | undefined = $state();

	function run(action: (() => Promise<void>) | undefined): void {
		menu?.hidePopover();
		action?.().catch((err) => console.error(err));
	}

	function openTrash(): void {
		menu?.hidePopover();
		void trashDialog?.show().catch((err) => console.error(err));
	}

	function openSettings(): void {
		menu?.hidePopover();
		settingsDialog?.show();
	}

	appMenu.trash = openTrash;
	appMenu.settings = openSettings;

	function onWindowKeydown(event: KeyboardEvent): void {
		if (event.ctrlKey && !event.altKey && !event.shiftKey && event.key === ',') {
			event.preventDefault();
			openSettings();
		}
	}

	function openAbout(): void {
		menu?.hidePopover();
		aboutDialog?.show();
	}

</script>

<svelte:window onkeydown={onWindowKeydown} />

<button class="tool" popovertarget="app-menu" aria-label="More" title="More">
	<Ellipsis size={16} />
</button>

<div id="app-menu" class="menu" popover bind:this={menu}>
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
	<button class="item" onclick={openTrash}>
		<ArchiveRestore size={16} /> Trash
	</button>
	<button class="item" role="menuitemcheckbox" aria-checked={ontop.enabled} onclick={() => ontop.toggle()}>
		<Pin size={16} /> Always on top
		{#if ontop.enabled}<Check size={16} class="item-check" />{/if}
	</button>
	{#if updates.available}
		<button class="item" disabled={updates.installing} onclick={() => run(() => updates.install())}>
			<Download size={16} />
			{updates.installing ? 'Installing…' : `Update to v${updates.available.version}`}
		</button>
	{/if}
	<div class="menu-sep"></div>
	<button class="item" onclick={openSettings}>
		<Settings size={16} /> Settings… <kbd>Ctrl+,</kbd>
	</button>
	<button class="item" onclick={openAbout}>
		<Info size={16} /> About mynotes
	</button>
</div>

<TrashDialog bind:this={trashDialog} />
<AboutDialog bind:this={aboutDialog} />
<SettingsDialog bind:this={settingsDialog} />
