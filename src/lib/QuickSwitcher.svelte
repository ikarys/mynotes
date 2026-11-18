<script lang="ts">
	import { workspace } from './workspace.svelte';
	import { search, type NoteMeta } from './api';
	import { relativeTime } from './text';
	import Icon from './Icon.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	let dialogEl: HTMLDialogElement | undefined = $state(undefined);
	let inputEl: HTMLInputElement | undefined = $state(undefined);
	let query = $state('');
	let results = $state<NoteMeta[]>([]);
	let selected = $state(0);
	let requestCounter = 0;

	async function load(q: string): Promise<void> {
		const requestId = ++requestCounter;
		try {
			const res = await search(q);
			if (requestId === requestCounter) {
				results = res;
				selected = 0;
			}
		} catch (err) {
			console.error(err);
		}
	}

	$effect(() => {
		if (open && dialogEl) {
			dialogEl.showModal();
			query = '';
			selected = 0;
			void load('');
			inputEl?.focus();
		} else if (!open && dialogEl?.open) {
			dialogEl.close();
		}
	});
</script>

<dialog
	class="switcher"
	aria-label="Find a note"
	bind:this={dialogEl}
	onclose={() => {
		open = false;
	}}
	onclick={(e) => {
		if (e.target === dialogEl) open = false;
	}}
>
	<input
		type="text"
		placeholder="Find a note"
		aria-label="Find a note"
		bind:this={inputEl}
		bind:value={query}
		oninput={() => void load(query)}
		onkeydown={(e) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				selected = (selected + 1) % Math.max(results.length, 1);
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				selected = (selected - 1 + Math.max(results.length, 1)) % Math.max(results.length, 1);
			} else if (e.key === 'Enter') {
				e.preventDefault();
				const meta = results[selected];
				if (meta) {
					workspace.open(meta);
					open = false;
				}
			}
		}}
	/>

	<div class="results" role="listbox" aria-label="Notes">
		{#if results.length === 0}
			<div class="empty">No matching notes</div>
		{:else}
			{#each results as meta, i (meta.id)}
				<!-- svelte-ignore a11y_click_events_have_key_events (keyboard selection is handled by the input, combobox pattern) -->
				<div
					class="option"
					role="option"
					tabindex="-1"
					aria-selected={selected === i ? 'true' : 'false'}
					onmousemove={() => {
						selected = i;
					}}
					onclick={() => {
						workspace.open(meta);
						open = false;
					}}
				>
					<Icon name={meta.kind} />
					<span class="option-title">{meta.title || 'Untitled'}</span>
					<span class="option-time">{relativeTime(meta.updated_at)}</span>
				</div>
			{/each}
		{/if}
	</div>
</dialog>
