# Agent instructions

Integration branch: `main` (trunk-based). Work on short-lived branches; the
agent merges into `main` itself, but only when the maintainer asks.

## Vibecoding Convention (level 1)

This project follows the Vibecoding Convention at level 1; see `VIBECODING.md`.

Before calling a change done, these must pass:
- `just test`
- `just lint` (includes `cargo fmt --check`)
- `gitleaks git`

Rules while editing:
- Every commit with AI-written content ends with the attribution trailer this
  project uses, naming the tool and model, for example `Assisted-by: Claude Code:claude-opus-5-5`.
- Deleting, skipping or weakening a test requires the reason in the commit message.
- A new dependency is checked against the registry (exists under that exact name,
  established, the one the code needs) and taken at the registry's current
  version, not the one you remember; the check is noted in the commit. Existing
  dependencies are not held back without a reason written in `VIBECODING.md`.
- No secret in any file, prompt or config.
- Every input is hostile: arguments, files, environment, network, model output.
  A change that touches parsing, SQL or command building, credentials or file
  import names the vulnerability class it guards against and its test.
- Signal over noise. A comment states a reason, a constraint or a trap, never
  what the line does. No TODO, placeholder, commented-out or dead code in a
  delivered change. Documentation proportionate to the project.

Never without a human: merge, release, change the CI, delete data.
