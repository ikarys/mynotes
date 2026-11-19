<script lang="ts">
	import { workspace } from './workspace.svelte';
	import { sidebar } from './sidebar.svelte';
	import type { NoteMeta } from './api';
	import { relativeTime, dayGroup, excerptFrom } from './text';
	import KindIcon from './KindIcon.svelte';
	import ChevronsLeft from '@lucide/svelte/icons/chevrons-left';

	const LIMIT = 200;

	type Group = {
		label: 'Today' | 'Yesterday' | 'Earlier';
		items: NoteMeta[];
	};

	const shown = $derived(workspace.notes.slice(0, LIMIT));

	const groups = $derived.by(() => {
		const result: Group[] = [];

		for (const meta of shown) {
			const label = dayGroup(meta.updated_at);
			const last = result[result.length - 1];

			if (last && last.label === label) {
				last.items.push(meta);
			} else {
				result.push({ label, items: [meta] });
			}
		}

		return result;
	});

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
							{@const excerpt = excerptFrom(meta.excerpt)}
							<li>
								<button
									class="note"
									class:active={meta.id === workspace.activeId}
									aria-current={meta.id === workspace.activeId ? 'true' : undefined}
									onclick={() => workspace.open(meta)}
								>
									<span class="note-top">
										<KindIcon kind={meta.kind} size={14} />
										<span class="note-title" class:untitled={!meta.title}>
											{meta.title ? meta.title : 'Untitled'}
										</span>
										<span class="note-time">{relativeTime(meta.updated_at)}</span>
									</span>
									{#if excerpt}
										<span class="note-excerpt">{excerpt}</span>
									{/if}
								</button>
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
