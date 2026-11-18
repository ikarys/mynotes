<script lang="ts">
	import { workspace } from './workspace.svelte';
</script>

<div class="toast" role="status" aria-live="polite">
	{#if workspace.toast}<span>{workspace.toast}</span>{/if}
</div>
