<p align="center"><img src="docs/logo.png" alt="mynotes logo: a fennec fox hugging a notebook" width="320"></p>

# mynotes

[![Vibecoding Convention](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ikarys/mynotes/main/audit/status.json)](VIBECODING.md)

A Windows notepad that starts instantly and remembers your notes without
files, with rich text, pasted images and mind maps. Built with Tauri 2 and
Svelte 5.

## Use

- `Ctrl+N` new note, `Ctrl+Shift+M` new mind map, `Ctrl+W` close tab,
  `Ctrl+Tab` next tab, `Ctrl+P` find a note (full-text search).
- Select text to format it; paste images or Markdown directly.
- A ```` ```markdown ```` code block has a Preview button to switch between
  its source and the rendered result.
- Mind map: `Tab` adds a child, `Enter` a sibling, `F2` renames,
  right-click for more.
- The `…` menu copies or exports the note as Markdown and switches between
  system, light and dark themes.
- `Ctrl+Alt+Space` (changeable in the `…` menu) shows or hides the window from
  anywhere, even when minimized; closing the window keeps mynotes in the tray.

Notes are saved automatically in `%APPDATA%\mynotes`.

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
