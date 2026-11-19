# How it is built and verified

mynotes is written with AI assistance. Claude Code frames the work and
reviews it, and a local model writes most of the code (see
[VIBECODING.md](VIBECODING.md)). Don't take the claims below on trust: each
one names a check you can run yourself.

## Requirements and their checks

| Requirement | How it is checked |
|---|---|
| Behaviour of storage, search, images, export names, autosave, Markdown, links and mind map conversion | `just test` (Rust unit tests and vitest) |
| Clean Rust and typed UI code | `just lint`: `cargo fmt --check`, `cargo clippy -D warnings`, `svelte-check` |
| No secrets in the history | `gitleaks git` |
| Security guards | [SECURITY.md](SECURITY.md) lists each guard with its test |
| Lightweight and fast: release exe under 15 MB, cold start under 500 ms, under 80 MB RAM | measured by hand on the release build (`just build`). The latest numbers are below |
| Light architecture | Rust core (storage, images, export) has no UI code; the UI talks to it through a few Tauri commands. The mind map library loads only when a mind map is opened |

## Latest measurements

| Date | Commit | Exe size | Cold start | RAM |
|---|---|---|---|---|
| 2026-11-18 | see git log | 4.9 MB | not measured yet (needs Windows) | not measured yet |
| 2026-11-19 | `opt-level = "z"` | 4.4 MB | not measured yet (needs Windows) | not measured yet |

## Not checked

- There is no blind usability test yet. It will come with the first public
  release.
- No CI on merges: the checks above run locally before each merge. Only
  releases run in CI: `.github/workflows/release.yml` runs the tests on a
  GitHub Windows runner, builds the installer and the portable exe from the
  tagged commit and attaches them with `SHA256SUMS` to the GitHub release, so
  a published binary can be traced to its source. A manual run of the same
  workflow builds them as an artifact for testing, without publishing.
