---
# AI involvement, AI-DECLARATION.md keys (https://github.com/DimwitLabs/AI-DECLARATION.md)
version: "0.1.1"
level: copilot
processes:
  design: pair
  implementation: copilot
  testing: copilot
  documentation: copilot
  review: assist
  deployment: assist
# Vibecoding Convention (https://github.com/ikarys/vibecoding-convention)
convention:
  version: "0.1"
  level: 1
  adopted_at: 082943d
  status: active
  tools:
    - "Claude Code:claude-opus-5-5"
    - "local:qwen3.8-27b"
  attribution_trailers: [Assisted-by]
  maintainers: [Ikarys]
  review: "single maintainer reviews every change; merges into main happen only on the maintainer's explicit request"
  security_response: "none"
  licence: MIT
  commands:
    test: "just test"
    lint: "just lint"
    format: "cargo fmt --manifest-path src-tauri/Cargo.toml"
    audit: "cargo audit --file src-tauri/Cargo.lock && npm audit"
    secrets: "gitleaks git"
    outdated: "cargo outdated --manifest-path src-tauri/Cargo.toml && npm outdated"
---

# Vibecoding declaration

This project follows the [Vibecoding Convention](https://github.com/ikarys/vibecoding-convention) version 0.1 at level 1.

## AI assistance

Claude Code frames the work, writes briefs and reviews; a local model
(qwen3.8-27b) writes most of the code from those briefs. The maintainer
decides the scope, tests the app by hand and approves every merge. Nearly
all of the code is AI-written.

## Review

Work happens on short-lived branches. The maintainer reads the diff and
asks for the merge into `main`; no merge happens without that request.

## Provenance and licence

This project is licensed under MIT. Parts of it are written by AI
assistants and may not be protected by copyright in some jurisdictions; the
maintainers accept this. To the maintainers' knowledge, no verbatim
reproduction of licence-incompatible code was included. Safeguards used:
human check of long generated blocks.

## Status

active. Security reports are acknowledged on a best effort basis, no
commitment; this is a single-user local app.
