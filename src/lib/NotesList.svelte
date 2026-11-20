<script lang="ts">
	import { tick } from 'svelte';
	import { workspace } from './workspace.svelte';
	import { sidebar } from './sidebar.svelte';
	import type { NoteMeta } from './api';
	import { relativeTime, dayGroup } from './text';
	import KindIcon from './KindIcon.svelte';
	import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';
	import Pin from '@lucide/svelte/icons/pin';
	import PinOff from '@lucide/svelte/icons/pin-off';
	import Lock from '@lucide/svelte/icons/lock';
	import LockOpen from '@lucide/svelte/icons/lock-open';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const LIMIT = 200;

	type Group = {
		label: 'Pinned' | 'Today' | 'Yesterday' | 'Earlier';
		items: NoteMeta[];
	};

	const shown = $derived(workspace.notes.slice(0, LIMIT));

	const groups = $derived.by(() => {
		const result: Group[] = [];

		for (const meta of shown) {
			const label = meta.pinned ? 'Pinned' : dayGroup(meta.updated_at);
			const last = result[result.length - 1];

			if (last && last.label === label) {
				last.items.push(meta);
			} else {
				result.push({ label, items: [meta] });
			}
		}

		return result;
	});

	let editingId = $state<number | null>(null);

	function focusSelect(node: HTMLInputElement) {
		node.focus();
		node.select();
	}

	async function finishRename(meta: NoteMeta, value: string | null, refocus: boolean) {
		if (editingId !== meta.id) return;
		editingId = null;
		if (value !== null && value.trim() !== meta.title) await workspace.rename(meta.id, value);
		if (refocus) {
			await tick();
			document.querySelector<HTMLElement>(`[data-note-id="${meta.id}"]`)?.focus();
		}
	}

	function renameKeys(event: KeyboardEvent, meta: NoteMeta) {
		const input = event.currentTarget as HTMLInputElement;
		if (event.key === 'Enter') void finishRename(meta, input.value, true);
		else if (event.key === 'Escape') {
			event.stopPropagation();
			void finishRename(meta, null, true);
		}
	}

	const countText = $derived(
		workspace.notes.length > LIMIT
			? `Latest ${LIMIT} of ${workspace.notes.length} notes`
			: `${workspace.notes.length} ${workspace.notes.length === 1 ? 'note' : 'notes'}`
	);
</script>

{#if sidebar.open}
	<aside class="notes" aria-label="Notes">
		{#if workspace.notes.length === 0}
			<p class="notes-empty">No notes yet</p>
		{:else}
			<div class="notes-scroll">
				{#each groups as group (group.label)}
					<h2 class="notes-group">{group.label}</h2>
					<ul class="notes-items" role="list">
						{#each group.items as meta (meta.id)}
							<li>
								{#if editingId === meta.id}
									<div class="note editing" class:active={meta.id === workspace.activeId}>
										<span class="note-top">
											<KindIcon kind={meta.kind} size={14} />
											<input
												class="note-rename"
												aria-label="Note title"
												placeholder="Automatic title"
												maxlength={200}
												value={meta.title}
												use:focusSelect
												onkeydown={(event) => renameKeys(event, meta)}
												onblur={(event) => void finishRename(meta, event.currentTarget.value, false)}
											/>
										</span>
									</div>
								{:else}
									<button
										class="note"
										class:active={meta.id === workspace.activeId}
										aria-current={meta.id === workspace.activeId ? 'true' : undefined}
										aria-keyshortcuts="F2"
										data-note-id={meta.id}
										onclick={() => workspace.open(meta)}
										ondblclick={() => (editingId = meta.id)}
										onkeydown={(event) => {
											if (event.key === 'F2') editingId = meta.id;
										}}
									>
										<span class="note-top">
											<KindIcon kind={meta.kind} size={14} />
											<span class="note-title" class:untitled={!meta.title}>
												{meta.title ? meta.title : 'Untitled'}
											</span>
											{#if meta.locked}
												<span class="note-flag" role="img" aria-label="Locked" title="Locked">
													<Lock size={12} />
												</span>
											{/if}
											<span class="note-time">{relativeTime(meta.updated_at)}</span>
										</span>
									</button>
									<span class="note-actions">
										<button
											class="note-action"
											aria-label={meta.pinned ? 'Unpin' : 'Pin to top'}
											title={meta.pinned ? 'Unpin' : 'Pin to top'}
											onclick={() => workspace.pin(meta.id, !meta.pinned)}
										>
											{#if meta.pinned}<PinOff size={14} />{:else}<Pin size={14} />{/if}
										</button>
										<button
											class="note-action"
											aria-label={meta.locked ? 'Unlock' : 'Lock against deletion'}
											title={meta.locked ? 'Unlock' : 'Lock against deletion'}
											onclick={() => workspace.lock(meta.id, !meta.locked)}
										>
											{#if meta.locked}<LockOpen size={14} />{:else}<Lock size={14} />{/if}
										</button>
										<button
											class="note-action"
											aria-label="Move to trash"
											title={meta.locked ? 'Unlock to move to trash' : 'Move to trash'}
											disabled={meta.locked}
											onclick={() => workspace.trash(meta.id)}
										>
											<Trash2 size={14} />
										</button>
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/each}
			</div>
		{/if}
		<footer class="notes-foot">
			<span class="notes-count">{countText}</span>
			<button class="tool" title="Hide notes list" aria-label="Hide notes list" onclick={() => sidebar.toggle()}>
				<ChevronsLeft size={16} />
			</button>
		</footer>
	</aside>
{/if}
