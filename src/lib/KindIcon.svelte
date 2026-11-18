<script lang="ts">
	import FileText from '@lucide/svelte/icons/file-text';
	import Workflow from '@lucide/svelte/icons/workflow';
	import type { Kind } from './api';

	let { kind, size = 16 }: { kind: Kind; size?: number } = $props();
</script>

{#if kind === 'mindmap'}
	<Workflow {size} strokeWidth={1.75} aria-hidden="true" />
{:else}
	<FileText {size} strokeWidth={1.75} aria-hidden="true" />
{/if}
