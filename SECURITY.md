# Security

mynotes is a single-user desktop app. Notes stay on the machine, in
`%APPDATA%\ovh.iks-homelab.mynotes`. The only network request is the update
check: a few seconds after start, mynotes downloads
`https://github.com/ikarys/mynotes/releases/latest/download/latest.json`
(nothing about you or your notes is sent; GitHub sees your IP address). Turn
it off in Settings (`Ctrl+,`).

## Reporting

Email `bikarys@proton.me`. Reports are handled on a best effort basis; there
is no response-time commitment.

## Threat model

Untrusted inputs are pasted content (HTML, Markdown, images), link targets,
the search box, export file names, text files opened with `Ctrl+O`, and the files the app reads back from
its data directory. Each guard below names the test that proves it.

| Guard | Vulnerability class | Test |
|---|---|---|
| Search text is quoted before it reaches SQLite FTS5, so it is never parsed as query syntax | Query injection | `storage.rs::search_matches_text_title_prefix_and_accent_insensitive` (hostile inputs `"`, `NEAR(`, `a OR`, `*`) |
| All SQL uses bound parameters | SQL injection | covered by the storage tests; no SQL is built by string concatenation |
| A pasted image is accepted only if its magic bytes are PNG, JPEG, GIF or WebP, and must be under 50 MB. SVG and HTML are refused | Script in disguised images, memory exhaustion | `images.rs::sniff_supported_formats_and_reject_others`, `save_image_rejects_oversized_input` |
| Image file names come from the SHA-256 of the bytes, never from the caller | Path traversal | `images.rs::save_image_deduplicates_and_uses_hash_names` |
| The export name proposed in the save dialog is stripped of path separators, control characters and Windows reserved names. Header decoding cannot panic | Path traversal, crash on malformed input | `export.rs::sanitize_*`, `percent_decode_malformed` |
| An opened file must be UTF-8 and under 5 MB; a `.txt` is inserted as literal text, never parsed as Markdown or HTML | Memory exhaustion, markup injection | `files.rs::decode_text_*`, `files.test.ts` (`keeps plain text literal`, `does not parse markdown in plain text`) |
| Files are written and read only at a path picked in the native dialog, never one sent by the webview | Arbitrary file write or read | `files.rs::save_text`, `open_text_file` take no path argument; no automated test |
| A markdown code block preview is built through the editor schema, unsafe links are dropped and clicks never navigate | Script injection through note content | `codeblock.test.ts` (`does not expose hostile attributes in preview`) |
| A note erased from the trash (by hand, by emptying it, or 30 days after deletion) leaves no text in the database files: `secure_delete` zeroes freed pages, FTS5 `secure-delete` purges index tokens, the WAL is truncated | Data remanence | `storage.rs::deleted_note_leaves_no_text_in_db_files` |
| Images no note references any more are removed (after a purge from the trash, and at startup) | Data remanence | `images.rs::prune_*` |
| Links open only for `http`, `https` and `mailto` targets | Script or local file execution through links | `links.test.ts` (`blocks javascript urls`, `blocks file urls`) |
| Stored mind map JSON is validated, and a corrupt file falls back to an empty map | Crash on hostile stored data | `mindmap.test.ts` (`parseMindmap`) |
| An update is installed only if its signature matches the public key built into the app (`plugins.updater.pubkey` in `src-tauri/tauri.conf.json`), and is fetched over HTTPS | Malicious or tampered update | enforced by `tauri-plugin-updater`; no test of ours |
| The portable exe never installs an update; it only opens the release page | Unexpected second install | `updater.rs::is_installed`; no automated test |
| The webview may only load images from the app's own `images` folder (asset protocol scope), and the CSP forbids remote scripts and connections | Local file disclosure, remote code | configuration in `src-tauri/tauri.conf.json`; no automated test |

## What is not protected

- The notes database is not encrypted. Anyone who can read your Windows
  profile can read your notes.
- Deletion works at file level. An SSD or a filesystem snapshot (Windows
  restore points, backups, OneDrive) may keep older copies of the blocks;
  only full-disk encryption (BitLocker) protects against that. Removed images
  are deleted, not overwritten.
- A note moved to the trash is still fully readable in the database until
  it is erased from the trash (at most 30 days).
- Files you save with `Save as…` are outside mynotes' control.
- Clipboard content you copy out of mynotes is visible to other apps.
- Updates trust the maintainer's signing key. Whoever holds that key can
  ship an update that installs without a warning.
