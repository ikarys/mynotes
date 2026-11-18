<script lang="ts">
	import { workspace } from './workspace.svelte';
	import Icon from './Icon.svelte';

	let { onsearch }: { onsearch: () => void } = $props();

	let tabRefs = new Map<number, HTMLDivElement>();

	function trackTab(node: HTMLElement, id: number) {
		const el = node as HTMLDivElement;
		tabRefs.set(id, el);
		return {
			destroy() {
				if (tabRefs.get(id) === el) tabRefs.delete(id);
			}
		};
	}

	$effect(() => {
		const id = workspace.active?.id;
		if (id == null) return;

		const el = tabRefs.get(id);
		if (!el) return;

		const frame = requestAnimationFrame(() => {
			el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		});
		return () => cancelAnimationFrame(frame);
	});
</script>

<nav class="tabbar">
	<div
		class="tabs"
		role="tablist"
		tabindex="-1"
		ondblclick={(e) => {
			if (e.target === e.currentTarget) void workspace.newNote('doc');
		}}
		onkeydown={(e) => {
			if (e.target === e.currentTarget && e.key === 'Enter') {
				e.preventDefault();
				void workspace.newNote('doc');
			}
		}}
	>
		{#each workspace.tabs as tab (tab.id)}
			<div
				class="tab"
				role="tab"
				aria-selected={tab.id === workspace.activeId ? 'true' : 'false'}
				tabindex={tab.id === workspace.activeId ? 0 : -1}
				use:trackTab={tab.id}
				onclick={() => workspace.activate(tab.id)}
				onauxclick={(e) => {
					if (e.button === 1) {
						e.preventDefault();
						void workspace.close(tab.id);
					}
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						e.stopPropagation();
						workspace.activate(tab.id);
					}
				}}
			>
				<Icon name={tab.kind} />
				<span class="title {tab.title ? '' : 'muted'}">{tab.title || 'Untitled'}</span>
				<button
					class="close"
					aria-label="Close tab"
					onclick={(e) => {
						e.stopPropagation();
						void workspace.close(tab.id);
					}}
				>
					<Icon name="close" size={12} />
				</button>
			</div>
		{/each}
	</div>

	<button class="tool" title="New note (Ctrl+N)" aria-label="New note" onclick={() => void workspace.newNote('doc')}>
		<Icon name="plus" />
	</button>
	<button
		class="tool"
		title="New mind map (Ctrl+Shift+M)"
		aria-label="New mind map"
		onclick={() => void workspace.newNote('mindmap')}
	>
		<Icon name="mindmap" />
	</button>
	<button class="tool" title="Find a note (Ctrl+P)" aria-label="Find a note" onclick={onsearch}>
		<Icon name="search" />
	</button>
</nav>
