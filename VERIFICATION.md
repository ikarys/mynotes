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
| 2026-11-19 | v0.2.0 portable | 4.4 MB | 313 ms median (301 to 421 ms) | 178 MB, misses the 80 MB target |
| 2026-11-20 | `af44dda` release build | 6.1 MB | 324 ms median (306 to 372 ms) | 184 MB, misses the 80 MB target |

How the v0.2.0 and `af44dda` rows were measured, on Windows 11, Ryzen 9 9950X3D:

- Start: time from launching the exe to the main window becoming visible.
  The window is shown only once the frontend calls `app_ready`, so visible
  means ready to type. The script waits for the window titled `mynotes`:
  the single-instance plugin opens a hidden window first, and waiting for
  any window handle would stop the clock at about 30 ms. 7 launches; the files were already in the OS cache,
  so a first start after a reboot is slower and is not measured.
- RAM: private memory summed over `mynotes.exe` and its 6 WebView2
  processes, window open. `mynotes.exe` alone is 16 MB (v0.2.0), 8.5 MB
  (`af44dda`); the WebView2 engine
  makes up the rest, so the 80 MB target is not met.
- CPU at rest: 0 ms of processor time over 10 s, window open.

## Not checked

- There is no blind usability test yet. It will come with the first public
  release.
- No CI on merges: the checks above run locally before each merge. Only
  releases run in CI: `.github/workflows/release.yml` runs the tests on a
  GitHub Windows runner, builds the installer and the portable exe from the
  tagged commit and attaches them with `SHA256SUMS` to the GitHub release, so
  a published binary can be traced to its source. The installer is signed
  with the update key (a GitHub secret) and a `latest.json` is published
  with it; installed apps refuse an update whose signature does not match
  the public key in `src-tauri/tauri.conf.json`. A manual run of the same
  workflow builds them as an artifact for testing, without publishing.
