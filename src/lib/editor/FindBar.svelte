<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';
	import { findState, type FindMatch } from './find';

	let { editor, replace, onclose }: {
		editor: Editor | undefined;
		replace: boolean;
		onclose: () => void;
	} = $props();

	// Read once: the bar is remounted on each Ctrl+F / Ctrl+H, so it starts from the live search.
	const initial = untrack(() => (editor ? findState(editor.state) : undefined));
	let findText = $state(initial?.query ?? '');
	let replaceText = $state('');
	let caseSensitive = $state(initial?.caseSensitive ?? false);
	let findInput: HTMLInputElement | undefined = $state(undefined);

	let findQuery = $state('');
	let findMatches = $state<FindMatch[]>([]);
	let findCurrent = $state(-1);

	$effect(() => {
		if (!editor) return;

		const update = (): void => {
			const state = findState(editor.state);
			findQuery = state.query;
			findMatches = state.matches;
			findCurrent = state.current;
		};

		update();
		editor.on('transaction', update);

		return () => editor.off('transaction', update);
	});

	onMount(() => {
		findInput?.focus();
		findInput?.select();
	});

	function counter(): string {
		if (!findQuery) return '';
		if (!findMatches.length) return 'No results';
		return `${Math.max(findCurrent + 1, 1)} / ${findMatches.length}`;
	}

	function onFindInput(e: Event): void {
		findText = (e.target as HTMLInputElement).value;
		editor?.commands.setFindQuery(findText, caseSensitive);
	}

	function onFindKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (e.shiftKey) editor?.commands.findPrevious();
			else editor?.commands.findNext();
		}
	}

	function onReplaceInput(e: Event): void {
		replaceText = (e.target as HTMLInputElement).value;
	}

	function onReplaceKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault();
			editor?.commands.replaceCurrent(replaceText);
		}
	}

	function onBarKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') close();
	}

	function toggleCase(): void {
		caseSensitive = !caseSensitive;
		editor?.commands.setFindQuery(findText, caseSensitive);
	}

	function close(): void {
		if (editor) {
			editor.commands.setFindQuery('');
			editor.commands.focus();
		}
		onclose();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Escape from any control inside the bar closes it) -->
<div class="find-bar" role="search" onkeydown={onBarKeydown}>
	<div class="find-row">
		<input
			class="find-input"
			placeholder="Find"
			aria-label="Find"
			value={findText}
			oninput={onFindInput}
			onkeydown={onFindKeydown}
			bind:this={findInput}
		/>

		{#if findQuery}
			<span class="find-count">{counter()}</span>
		{/if}

		<button type="button" class="icon-btn" aria-label="Previous match" onclick={() => editor?.commands.findPrevious()}>
			<ChevronUp size={14} />
		</button>
		<button type="button" class="icon-btn" aria-label="Next match" onclick={() => editor?.commands.findNext()}>
			<ChevronDown size={14} />
		</button>

		<button
			type="button"
			class="icon-btn toggle"
			class:active={caseSensitive}
			aria-label="Match case"
			aria-pressed={caseSensitive}
			onclick={toggleCase}
		>
			Aa
		</button>

		<button type="button" class="icon-btn" aria-label="Close find" onclick={close}>
			<X size={14} />
		</button>
	</div>

	{#if replace}
		<div class="find-row replace-row">
			<input
				class="find-input"
				placeholder="Replace"
				aria-label="Replace"
				value={replaceText}
				oninput={onReplaceInput}
				onkeydown={onReplaceKeydown}
			/>

			<button type="button" class="text-btn" onclick={() => editor?.commands.replaceCurrent(replaceText)}>
				Replace
			</button>
			<button type="button" class="text-btn" onclick={() => editor?.commands.replaceAll(replaceText)}>
				Replace all
			</button>
		</div>
	{/if}
</div>
