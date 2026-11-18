target := "x86_64-pc-windows-msvc"
exe := "src-tauri/target/" + target + "/debug/mynotes.exe"

# Vite in WSL + debug Windows exe (cargo-xwin), hot reload of the UI.
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    npx vite & trap "kill $!" EXIT
    (cd src-tauri && cargo xwin build --target {{target}})
    {{exe}}

# Release Windows exe.
build:
    cargo tauri build --runner cargo-xwin --target {{target}}

test:
    cd src-tauri && cargo test
    npx vitest run --passWithNoTests

lint:
    cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings
    npm run check
