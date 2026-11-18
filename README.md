# mynotes

[![Vibecoding Convention](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/ikarys/mynotes/main/audit/status.json)](VIBECODING.md)

A Windows notepad that starts instantly and remembers your notes without
files, with rich text, pasted images and mind maps. Built with Tauri 2 and
Svelte 5.

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

Licence: MIT.
