<script lang="ts">
	import { confirmer } from './confirm.svelte';

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (confirmer.request && !dialog.open) dialog.showModal();
		else if (!confirmer.request && dialog.open) dialog.close();
	});
</script>

<dialog class="sheet confirm" aria-labelledby="confirm-title" bind:this={dialog} onclose={() => confirmer.answer(false)}>
	<h2 class="sheet-title" id="confirm-title">{confirmer.request?.title}</h2>
	<p class="confirm-message">{confirmer.request?.message}</p>
	<div class="sheet-footer">
		<!-- Cancel comes first: showModal focuses it, so Enter never destroys by accident. -->
		<button class="sheet-btn confirm-btn" onclick={() => confirmer.answer(false)}>Cancel</button>
		<button class="sheet-btn confirm-btn danger-solid" onclick={() => confirmer.answer(true)}>
			{confirmer.request?.confirmLabel}
		</button>
	</div>
</dialog>
