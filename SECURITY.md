# Security

mynotes is a single-user desktop app. Notes stay on the machine, in
`%APPDATA%\mynotes`, and nothing is sent over the network.

## Reporting

Email `bikarys@proton.me`. Reports are handled on a best effort basis; there
is no response-time commitment.

## Threat model

Untrusted inputs are pasted content (HTML, Markdown, images), link targets,
the search box, export file names, and the files the app reads back from
its data directory. Each guard below names the test that proves it.

| Guard | Vulnerability class | Test |
|---|---|---|
| Search text is quoted before it reaches SQLite FTS5, so it is never parsed as query syntax | Query injection | `storage.rs::search_matches_text_title_prefix_and_accent_insensitive` (hostile inputs `"`, `NEAR(`, `a OR`, `*`) |
| All SQL uses bound parameters | SQL injection | covered by the storage tests; no SQL is built by string concatenation |
| A pasted image is accepted only if its magic bytes are PNG, JPEG, GIF or WebP, and must be under 50 MB. SVG and HTML are refused | Script in disguised images, memory exhaustion | `images.rs::sniff_supported_formats_and_reject_others`, `save_image_rejects_oversized_input` |
| Image file names come from the SHA-256 of the bytes, never from the caller | Path traversal | `images.rs::save_image_deduplicates_and_uses_hash_names` |
| The export name proposed in the save dialog is stripped of path separators, control characters and Windows reserved names. Header decoding cannot panic | Path traversal, crash on malformed input | `export.rs::sanitize_*`, `percent_decode_malformed` |
| Links open only for `http`, `https` and `mailto` targets | Script or local file execution through links | `links.test.ts` (`blocks javascript urls`, `blocks file urls`) |
| Stored mind map JSON is validated, and a corrupt file falls back to an empty map | Crash on hostile stored data | `mindmap.test.ts` (`parseMindmap`) |
| The webview may only load images from the app's own `images` folder (asset protocol scope), and the CSP forbids remote scripts and connections | Local file disclosure, remote code | configuration in `src-tauri/tauri.conf.json`; no automated test |

## What is not protected

- The notes database is not encrypted. Anyone who can read your Windows
  profile can read your notes.
- Clipboard content you copy out of mynotes is visible to other apps.
