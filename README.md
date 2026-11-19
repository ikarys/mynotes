<p align="center"><img src="docs/logo.png" alt="mynotes logo: a fennec fox hugging a notebook" width="320"></p>

# mynotes

[![Vibecoding Convention](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ikarys/mynotes/main/audit/status.json)](VIBECODING.md)

A Windows notepad that starts instantly and remembers your notes without
files, with rich text, pasted images and mind maps. Built with Tauri 2 and
Svelte 5.

## Install (Windows 10/11, x64)

Download from [Releases](https://github.com/ikarys/mynotes/releases):

- `…-setup.exe` installs for the current user (no admin rights), adds a
  Start menu entry and an uninstaller. Uninstalling removes the app, its
  shortcuts and its autostart entry. Your notes are kept unless you tick
  "Delete the application data".
- `…-portable.exe` runs from anywhere, nothing installed.

Both are unsigned, so Windows SmartScreen warns on first launch: click
"More info", then "Run anyway". `SHA256SUMS` lets you check the download.

## Use

- `Ctrl+N` new note, `Ctrl+Shift+M` new mind map, `Ctrl+W` close tab,
  `Ctrl+Tab` next tab, `Ctrl+P` find a note (full-text search).
- `Ctrl+O` opens a `.md` or `.txt` file as a new note; `Ctrl+Shift+S` saves
  the note as Markdown or plain text.
- Closing a tab keeps the note (find it again with `Ctrl+P`); `Move to trash`
  in the `…` menu hides it; the Trash (same menu) restores it or erases it
  for good, and notes left there are erased after 30 days.
- `Ctrl+F` finds text in the note, `Ctrl+H` finds and replaces.
- Select text to format it; paste images or Markdown directly.
- A ```` ```markdown ```` code block has a Preview button to switch between
  its source and the rendered result.
- A code block's language (Markdown, JSON, YAML) can be changed from the
  selector at its top right; JSON and YAML are coloured.
- Mind map: `Tab` adds a child, `Enter` a sibling, `F2` renames,
  right-click for more.
- The `…` menu also copies the note as Markdown, exports a mind map as PNG,
  switches between system, light and dark themes, sets the font and size of
  note text, and opens the data folder.
- `Ctrl+Alt+Space` (changeable in the `…` menu) shows or hides the window from
  anywhere, even when minimized; closing the window keeps mynotes in the tray.
  The window reopens at the size and place you left it.
- When a new version is out, the `…` menu shows `Update to vX`: the installed
  app updates and restarts itself, the portable exe opens the download page.
  The check runs a few seconds after start; turn it off in the same menu.

Notes are saved automatically in `%APPDATA%\ovh.iks-homelab.mynotes`
(`mynotes.db` and an `images` folder).

AI assistance: this project is written with AI help, see [VIBECODING.md](VIBECODING.md).

## Develop (from WSL)

Needs Node 22+, Rust with the `x86_64-pc-windows-msvc` target, `cargo-xwin`,
`clang`, `lld`, `llvm` and `just`.

```
npm install
just dev     # Vite in WSL + debug Windows exe with hot reload
just test
just lint
just build   # release exe
```

How it is built and verified: [VERIFICATION.md](VERIFICATION.md).
Security: [SECURITY.md](SECURITY.md).

Licence: MIT.
