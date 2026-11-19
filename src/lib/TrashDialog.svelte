<script lang="ts">
	import { listTrash, purgeNote, emptyTrash, type NoteMeta } from './api';
	import { workspace } from './workspace.svelte';
	import KindIcon from './KindIcon.svelte';

	let dialog: HTMLDialogElement | undefined = $state();
	let items: NoteMeta[] = $state([]);

	export async function show(): Promise<void> {
		try {
			items = await listTrash();
		} catch (err) {
			console.error(err);
			items = [];
			workspace.notify('Could not load the trash');
		}
		dialog?.showModal();
	}

	async function restore(meta: NoteMeta): Promise<void> {
		try {
			await workspace.restoreFromTrash(meta);
			dialog?.close();
		} catch (err) {
			console.error(err);
			workspace.notify('Restore failed');
		}
	}

	async function remove(meta: NoteMeta): Promise<void> {
		const title = meta.title || 'Untitled';
		if (!confirm(`Erase "${title}" for good? This cannot be undone.`)) return;
		try {
			await purgeNote(meta.id);
			items = items.filter((item) => item.id !== meta.id);
		} catch (err) {
			console.error(err);
			workspace.notify('Delete failed');
		}
	}

	async function clearTrash(): Promise<void> {
		if (items.length === 0) return;
		if (!confirm('Erase every note in the trash for good? This cannot be undone.')) return;
		try {
			await emptyTrash();
			items = [];
		} catch (err) {
			console.error(err);
			workspace.notify('Empty trash failed');
		}
	}
</script>

<dialog class="sheet" bind:this={dialog}>
	<h2 class="sheet-title">Trash</h2>
	<p class="sheet-note">Notes are erased for good 30 days after deletion.</p>

	{#if items.length === 0}
		<div class="empty">The trash is empty.</div>
	{:else}
		<div class="trash-list">
			{#each items as meta (meta.id)}
				<div class="trash-row">
					<span class="trash-icon"><KindIcon kind={meta.kind} /></span>
					<span class="trash-title">{meta.title || 'Untitled'}</span>
					<span class="row-actions">
						<button class="sheet-btn" onclick={() => void restore(meta)}>Restore</button>
						<button class="sheet-btn danger" onclick={() => void remove(meta)}>Delete forever</button>
					</span>
				</div>
			{/each}
		</div>
	{/if}

	<div class="sheet-footer">
		<button class="sheet-btn danger" disabled={items.length === 0} onclick={() => void clearTrash()}>
			Empty trash
		</button>
		<button class="sheet-btn" onclick={() => dialog?.close()}>Close</button>
	</div>
</dialog>
