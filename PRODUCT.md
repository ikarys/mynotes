# Product

<!-- impeccable:product-schema 1 -->

Recorded from the maintainer's written plan (2026-11-18), without a separate interview.

## Platform

web

## Users

One person on Windows who wants to jot something down right now: a thought, a pasted
screenshot, a list, the outline of an idea. They summon the app with a shortcut or the
tray, type, and dismiss it. Mostly mouse-driven, with a few keyboard shortcuts.

## Product Purpose

A notepad that opens as fast as Windows Notepad but keeps rich text, pasted images and
mind maps, and never asks to save. Success: open, write, close, find it again with Ctrl+P.

## Positioning

Notepad speed and tabs, with rich text and mind maps, local only, no account, no cloud.

## Operating Context

Lives in the tray, starts with Windows, toggled by a global shortcut (Alt+Space by default, changeable in the menu). Notes are tabs like
Notepad (Ctrl+N document, Ctrl+Shift+M mind map, Ctrl+W close, Ctrl+Tab). Content leaves
the app as Markdown (copy, export) or PNG (mind map).

## Capabilities and Constraints

- Tauri 2 on WebView2; Svelte 5 frontend; SQLite storage with full-text search.
- Autosave (400 ms after typing, on blur and close); no save button, no file dialogs.
- Targets: executable under 15 MB, cold start under 500 ms, under 80 MB RAM.
- Light and dark follow the Windows setting.
- Whiteboard, sync and multi-window are out of scope for v1.

## Brand Commitments

Name "mynotes" (lower case). Logo: a fennec fox hugging a notebook, warm orange on dark
navy (`docs/logo-source.png`).

## Product Principles

1. Instant beats featureful: nothing may slow the first paint or a keystroke.
2. Never lose a word: every edit is persisted without asking.
3. Calm chrome: the note is the interface; controls stay out of the way until pointed at.
4. Familiar over clever: Notepad and Windows conventions first.
