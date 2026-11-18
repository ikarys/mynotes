<script lang="ts">
	let {
		name,
		size = 16
	}: {
		name: 'doc' | 'mindmap' | 'plus' | 'close' | 'search';
		size?: number;
	} = $props();
</script>

<svg
	viewBox="0 0 16 16"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if name === 'doc'}
		<path d="M4 2h5l3 3v9H4z" />
		<path d="M9 2v3h3" />
		<path d="M6 8h4M6 11h4" />
	{:else if name === 'mindmap'}
		<circle cx="8" cy="8" r="1.5" />
		<circle cx="3.5" cy="4" r="1.2" />
		<circle cx="12.5" cy="4" r="1.2" />
		<circle cx="8" cy="13" r="1.2" />
		<path d="M8 8 4.5 4.8M8 8l4-3.2M8 8v4" />
	{:else if name === 'plus'}
		<path d="M8 3v10M3 8h10" />
	{:else if name === 'close'}
		<path d="M4 4l8 8M12 4l-8 8" />
	{:else}
		<circle cx="7" cy="7" r="4" />
		<path d="M10 10l4 4" />
	{/if}
</svg>
