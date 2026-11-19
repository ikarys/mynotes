<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { loadNote, saveNote, saveText } from './api';
	import { createAutosave, type Autosave } from './autosave';
	import { workspace, type NoteActions } from './workspace.svelte';
	import type MindElixir from 'mind-elixir';
	import type { Theme } from 'mind-elixir';
	import Plus from '@lucide/svelte/icons/plus';
	import {
		isEmptyMindmap,
		mindmapMarkdown,
		mindmapText,
		mindmapTitle,
		parseMindmap
	} from './mindmap';

	let { id }: { id: number } = $props();

	let element: HTMLDivElement | undefined = $state();
	let wrap: HTMLDivElement | undefined = $state();
	let plus: { x: number; y: number } | null = $state(null);

	let mind: MindElixir | undefined;
	let ready = $state(false);
	let autosave: Autosave | undefined;
	let destroyed = false;

	const onOperation = () => {
		const current = mind;
		if (!current) return;

		const data = current.getData();
		workspace.update(id, { title: mindmapTitle(data), empty: isEmptyMindmap(data) });
		autosave?.schedule();
		// Edits can push the selected node off-screen; the map pans with transforms, not scroll.
		requestAnimationFrame(() => {
			const node = mind?.currentNode;
			if (node) mind?.scrollIntoView(node);
			place();
		});
	};

	const place = () => {
		const current = mind;
		if (!current || current.currentNodes.length !== 1) {
			plus = null;
			return;
		}

		if (element?.querySelector('#input-box')) {
			plus = null;
			return;
		}

		const node = current.currentNode;
		if (!node || !wrap) {
			plus = null;
			return;
		}

		const r = node.getBoundingClientRect();
		const w = wrap.getBoundingClientRect();
		// In SIDE mode the library puts a new root child on the emptier side, left on a tie, whatever we ask.
		const root = node.nodeObj.parent === undefined;
		const count = (side: string) => element?.querySelector(`.${side}`)?.childElementCount ?? 0;
		const left = root ? count('lhs') <= count('rhs') : node.closest('.lhs') !== null;
		const size = 24;
		const y = r.top - w.top + r.height / 2 - size / 2;
		const x = left ? r.left - w.left - 8 - size : r.right - w.left + 8;
		plus = { x, y };
	};

	const onPlace = () => requestAnimationFrame(place);

	// Mind Elixir only edits on F2 or double-click; typing on a selected node renames it, like a spreadsheet cell.
	const onKeydown = (event: KeyboardEvent) => {
		const current = mind;
		if (!current || event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
		if ((event.target as HTMLElement).id === 'input-box' || current.currentNodes.length !== 1) return;

		void current.beginEdit().then(() => {
			const box = element?.querySelector<HTMLElement>('#input-box');
			if (!box) return;
			box.textContent = event.key;
			const selection = getSelection();
			selection?.selectAllChildren(box);
			selection?.collapseToEnd();
		});
	};

	// The library opens the editor on the new node itself; refocusing the map would close it.
	const addChild = () => {
		const node = mind?.currentNode;
		if (node) void mind?.addChild(node);
	};

	const flushAutosave = () => {
		void autosave?.flush();
	};

	const onVisibilityChange = () => {
		if (document.visibilityState === 'hidden') flushAutosave();
	};

	const actions: NoteActions = {
		async copyMarkdown() {
			try {
				const current = mind;
				if (!current) return;

				await navigator.clipboard.writeText(mindmapMarkdown(current.getData()));
				workspace.notify('Copied as Markdown');
			} catch (error) {
				console.error(error);
			}
		},
		async saveAs() {
			try {
				const current = mind;
				if (!current) return;

				await autosave?.flush();

				const data = current.getData();
				const markdown = mindmapMarkdown(data);
				const plain = mindmapText(data);
				const title = mindmapTitle(data) || 'mind map';
				if (await saveText(title, markdown, plain)) workspace.notify('Saved');
			} catch (error) {
				console.error(error);
				workspace.notify('Save failed');
			}
		}
	};

	onMount(async () => {
		let note: { content: string } | null = null;

		try {
			note = await loadNote(id);
		} catch (error) {
			console.error(error);
		}

		if (destroyed) return;

		const data = parseMindmap(note?.content ?? '');

		try {
			const { default: MindElixirCtor } = await import('mind-elixir');
			if (destroyed) return;

			await import('mind-elixir/style.css');
			if (destroyed) return;

			if (!element) return;

			// Default sub-branches underline deep topics; boxed topics need the line to meet their side at mid-height.
			const generateSubBranch: Theme['generateSubBranch'] = function ({ pT, pL, pW, pH, cT, cL, cW, cH, direction }) {
				const gap = parseInt(this.container.style.getPropertyValue('--node-gap-x'));
				const y1 = pT + pH / 2;
				const y2 = cT + cH / 2;
				const bend = Math.min((Math.abs(y1 - y2) / 300) * gap, gap);
				if (direction === 'lhs') {
					const x = pL;
					return `M ${x + gap} ${y1} C ${x - bend} ${y1} ${x + bend} ${y2} ${x - gap} ${y2} H ${cL + cW - gap}`;
				}
				const x = pL + pW;
				return `M ${x - gap} ${y1} C ${x + bend} ${y1} ${x - bend} ${y2} ${x + gap} ${y2} H ${cL + gap}`;
			};

			const theme: Theme = {
				name: 'mynotes',
				type: 'light',
				generateSubBranch,
				palette: ['#f7941d', '#5b8def', '#3fb68b', '#c86bd9', '#e5534b', '#d4a72c'],
				cssVar: {
					'--bgcolor': 'var(--bg)',
					'--color': 'var(--text)',
					'--main-color': 'var(--text)',
					'--main-bgcolor': 'var(--surface)',
					'--main-bgcolor-transparent': 'transparent',
					'--root-color': '#1d1c26',
					'--root-bgcolor': 'var(--accent)',
					'--root-border-color': 'transparent',
					'--selected': 'var(--accent)',
					'--accent-color': 'var(--accent)',
					'--panel-color': 'var(--text)',
					'--panel-bgcolor': 'var(--surface)',
					'--panel-border-color': 'var(--line)',
					'--root-radius': '10px',
					'--main-radius': '8px'
				}
			};

			const instance = new MindElixirCtor({
				el: element,
				direction: MindElixirCtor.SIDE,
				toolBar: false,
				contextMenu: true,
				keypress: true,
				// Left-drag pans like any canvas app; box selection moves to the right button.
				mouseSelectionButton: 2,
				allowUndo: true,
				newTopicName: 'Topic',
				theme
			});

			mind = instance;
			await instance.init(data);
			if (destroyed) {
				instance.destroy();
				return;
			}

			workspace.update(id, { title: mindmapTitle(data), empty: isEmptyMindmap(data) });

			autosave = createAutosave(async () => {
				const current = mind;
				if (!current) return;

				const currentData = current.getData();
				// The theme is the app's, not the note's: a stored copy would override it on reload.
				const content = JSON.stringify({ ...currentData, theme: undefined });
				await saveNote(id, mindmapTitle(currentData), content, mindmapText(currentData));
			});

			instance.bus.addListener('operation', onOperation);
			instance.bus.addListener('selectNodes', onPlace);
			instance.bus.addListener('unselectNodes', onPlace);
			instance.bus.addListener('move', onPlace);
			instance.bus.addListener('scale', onPlace);
			element.addEventListener('keydown', onKeydown);
			element.addEventListener('focusout', onPlace);
			element.addEventListener('focusin', onPlace);
			instance.selectNode(instance.findEle(instance.nodeData.id));
			instance.container.focus({ preventScroll: true });
			ready = true;
			requestAnimationFrame(place);
			window.addEventListener('blur', flushAutosave);
			document.addEventListener('visibilitychange', onVisibilityChange);
			window.addEventListener('resize', onPlace);
			workspace.setActions(actions);
		} catch (error) {
			console.error(error);
			mind?.destroy();
			mind = undefined;
		}
	});

	onDestroy(() => {
		destroyed = true;

		window.removeEventListener('blur', flushAutosave);
		document.removeEventListener('visibilitychange', onVisibilityChange);
		window.removeEventListener('resize', onPlace);
		element?.removeEventListener('keydown', onKeydown);
		element?.removeEventListener('focusout', onPlace);
		element?.removeEventListener('focusin', onPlace);

		const last = mind;
		if (last) {
			last.bus.removeListener('operation', onOperation);
			last.bus.removeListener('selectNodes', onPlace);
			last.bus.removeListener('unselectNodes', onPlace);
			last.bus.removeListener('move', onPlace);
			last.bus.removeListener('scale', onPlace);
		}

		void (autosave?.flush() ?? Promise.resolve()).finally(() => last?.destroy());

		if (actions && workspace.actions === actions) workspace.setActions(null);
	});
</script>

<div class="wrap" bind:this={wrap}>
	<div class="mindmap" bind:this={element}></div>
	{#if plus}
		<button
			class="plus"
			type="button"
			title="Add child (Tab)"
			aria-label="Add child"
			style:left="{plus.x}px"
			style:top="{plus.y}px"
			onmousedown={(e) => e.preventDefault()}
			onclick={addChild}
		>
			<Plus size={14} />
		</button>
	{/if}
	{#if ready}
		<p class="hint">Drag to pan · Type or double-click to edit · + or Tab adds a child · Right-click for more</p>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.mindmap {
		width: 100%;
		height: 100%;
	}

	.plus {
		position: absolute;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--line);
		background: var(--surface);
		color: var(--muted);
		display: grid;
		place-items: center;
		padding: 0;
		box-shadow: var(--shadow);
		cursor: pointer;
		z-index: 5;
	}

	.plus:hover {
		background: var(--accent);
		color: #1d1c26;
		border-color: transparent;
	}

	.hint {
		position: absolute;
		left: 16px;
		top: 10px;
		margin: 0;
		font-size: 12px;
		color: var(--muted);
		pointer-events: none;
	}

	.mindmap :global(.map-container) {
		background: var(--bg);
	}

	.mindmap :global(.me-children .me-tpc) {
		border: 1px solid var(--line);
		background: var(--surface);
		border-radius: 6px;
		padding: 4px 10px;
	}
</style>
