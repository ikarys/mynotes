<script lang="ts">
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { version } from '../../package.json';
	import icon from '../../src-tauri/icons/128x128.png';

	let dialog: HTMLDialogElement | undefined = $state();

	export function show(): void {
		dialog?.showModal();
	}

	function openLink(event: MouseEvent, href: string): void {
		event.preventDefault();
		openUrl(href).catch((err) => console.error(err));
	}
</script>

<dialog class="sheet about" bind:this={dialog}>
	<img src={icon} width={64} height={64} alt="" />
	<h2>mynotes</h2>
	<div class="version">Version {version}</div>
	<p>A notepad that is already open.</p>
	<div class="links">
		<a
			href="https://ikarys.github.io/mynotes/"
			onclick={(event) => openLink(event, 'https://ikarys.github.io/mynotes/')}
		>
			Website
		</a>
		<a
			href="https://github.com/ikarys/mynotes"
			onclick={(event) => openLink(event, 'https://github.com/ikarys/mynotes')}
		>
			Source code
		</a>
	</div>
	<div class="license">MIT licence</div>
	<button class="sheet-btn" onclick={() => dialog?.close()}>Close</button>
</dialog>
