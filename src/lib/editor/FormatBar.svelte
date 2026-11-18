<script lang="ts">
	import { untrack } from 'svelte';
	import type { Editor } from '@tiptap/core';
	import Bold from '@lucide/svelte/icons/bold';
	import Italic from '@lucide/svelte/icons/italic';
	import Underline from '@lucide/svelte/icons/underline';
	import Strikethrough from '@lucide/svelte/icons/strikethrough';
	import Highlighter from '@lucide/svelte/icons/highlighter';
	import Code from '@lucide/svelte/icons/code';
	import Heading1 from '@lucide/svelte/icons/heading-1';
	import Heading2 from '@lucide/svelte/icons/heading-2';
	import List from '@lucide/svelte/icons/list';
	import ListOrdered from '@lucide/svelte/icons/list-ordered';
	import ListTodo from '@lucide/svelte/icons/list-todo';
	import Quote from '@lucide/svelte/icons/quote';
	import Link from '@lucide/svelte/icons/link';
	import Unlink from '@lucide/svelte/icons/unlink';
	import Check from '@lucide/svelte/icons/check';
	import { safeHref } from './links';

	let { editor, el = $bindable() }: { editor: Editor | undefined; el?: HTMLDivElement } = $props();

	let version = $state(0);
	let linkMode = $state(false);
	let linkValue = $state('');
	let linkInvalid = $state(false);
	let inputEl: HTMLInputElement | undefined = $state(undefined);

	$effect(() => {
		const current = editor;
		if (!current) return;

		// Focus/blur transactions are skipped: blur fires during Svelte's DOM teardown on tab switch, where a state write throws.
		const update = ({ transaction }: { transaction: { selectionSet: boolean; docChanged: boolean } }) => {
			if (!transaction.selectionSet && !transaction.docChanged) return;
			if (transaction.selectionSet) linkMode = false;
			version++;
		};

		current.on('transaction', update);
		untrack(() => version++);
		return () => current.off('transaction', update);
	});

	$effect(() => {
		if (linkMode) inputEl?.focus();
	});

	function isActive(name: string): boolean {
		void version;
		return editor?.isActive(name) ?? false;
	}

	function isHeadingActive(level: number): boolean {
		void version;
		if (!editor?.isActive('heading')) return false;
		const attrs = editor.getAttributes('heading') as { level?: number };
		return attrs.level === level;
	}

	function enterLinkMode(): void {
		if (!editor) return;
		const attrs = editor.getAttributes('link') as { href?: string };
		linkValue = attrs.href ?? '';
		linkInvalid = false;
		linkMode = true;
	}

	function setLink(): void {
		if (!editor) return;
		const href = safeHref(linkValue);

		if (linkValue.trim() && !href) {
			linkInvalid = true;
			return;
		}

		if (!href) {
			editor.chain().focus().unsetLink().run();
			linkMode = false;
			return;
		}

		editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
		linkMode = false;
	}

	function removeLink(): void {
		if (!editor) return;
		editor.chain().focus().unsetLink().run();
		linkMode = false;
	}

	function onKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			event.preventDefault();
			setLink();
		} else if (event.key === 'Escape') {
			linkMode = false;
			editor?.commands.focus();
		}
	}
</script>

<div class="formatbar" role="toolbar" aria-label="Formatting" bind:this={el}>
	{#if linkMode}
		<input
			class="link-input"
			class:invalid={linkInvalid}
			placeholder="Paste or type a link"
			aria-label="Link"
			bind:this={inputEl}
			bind:value={linkValue}
			onkeydown={onKeydown}
		/>
		<button
			type="button"
			aria-label="Confirm link"
			title="Confirm link"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => setLink()}
		>
			<Check size={16} strokeWidth={2} />
		</button>
		{#if isActive('link')}
			<button
				type="button"
				aria-label="Remove link"
				title="Remove link"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => removeLink()}
			>
				<Unlink size={16} strokeWidth={2} />
			</button>
		{/if}
	{:else}
		<button
			type="button"
			aria-label="Bold (Ctrl+B)"
			title="Bold (Ctrl+B)"
			aria-pressed={isActive('bold') ? 'true' : 'false'}
			class:on={isActive('bold')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleBold().run()}
		>
			<Bold size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Italic (Ctrl+I)"
			title="Italic (Ctrl+I)"
			aria-pressed={isActive('italic') ? 'true' : 'false'}
			class:on={isActive('italic')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleItalic().run()}
		>
			<Italic size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Underline (Ctrl+U)"
			title="Underline (Ctrl+U)"
			aria-pressed={isActive('underline') ? 'true' : 'false'}
			class:on={isActive('underline')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleUnderline().run()}
		>
			<Underline size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Strikethrough"
			title="Strikethrough"
			aria-pressed={isActive('strike') ? 'true' : 'false'}
			class:on={isActive('strike')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleStrike().run()}
		>
			<Strikethrough size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Highlight"
			title="Highlight"
			aria-pressed={isActive('highlight') ? 'true' : 'false'}
			class:on={isActive('highlight')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleHighlight().run()}
		>
			<Highlighter size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Code"
			title="Code"
			aria-pressed={isActive('code') ? 'true' : 'false'}
			class:on={isActive('code')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleCode().run()}
		>
			<Code size={16} strokeWidth={2} />
		</button>
		<span class="sep"></span>
		<button
			type="button"
			aria-label="Heading 1"
			title="Heading 1"
			aria-pressed={isHeadingActive(1) ? 'true' : 'false'}
			class:on={isHeadingActive(1)}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
		>
			<Heading1 size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Heading 2"
			title="Heading 2"
			aria-pressed={isHeadingActive(2) ? 'true' : 'false'}
			class:on={isHeadingActive(2)}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
		>
			<Heading2 size={16} strokeWidth={2} />
		</button>
		<span class="sep"></span>
		<button
			type="button"
			aria-label="Bullet list"
			title="Bullet list"
			aria-pressed={isActive('bulletList') ? 'true' : 'false'}
			class:on={isActive('bulletList')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleBulletList().run()}
		>
			<List size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Numbered list"
			title="Numbered list"
			aria-pressed={isActive('orderedList') ? 'true' : 'false'}
			class:on={isActive('orderedList')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleOrderedList().run()}
		>
			<ListOrdered size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Checklist"
			title="Checklist"
			aria-pressed={isActive('taskList') ? 'true' : 'false'}
			class:on={isActive('taskList')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleTaskList().run()}
		>
			<ListTodo size={16} strokeWidth={2} />
		</button>
		<button
			type="button"
			aria-label="Quote"
			title="Quote"
			aria-pressed={isActive('blockquote') ? 'true' : 'false'}
			class:on={isActive('blockquote')}
			onmousedown={(e) => e.preventDefault()}
			onclick={() => editor?.chain().focus().toggleBlockquote().run()}
		>
			<Quote size={16} strokeWidth={2} />
		</button>
		<span class="sep"></span>
		<button
			type="button"
			aria-label="Link"
			title="Link"
			onmousedown={(e) => e.preventDefault()}
			onclick={() => enterLinkMode()}
		>
			<Link size={16} strokeWidth={2} />
		</button>
	{/if}
</div>
