# Design

Operate surface: a quiet Windows tool. The brand appears in precise details (accent,
caret, selection, focus), never as decoration.

## Type

Segoe UI Variable (the Windows system face), one family. UI 13px; editor body 15px /
1.6, full window width (the maintainer wants the whole window to write in); headings 1.6 / 1.3 / 1.1 rem, weight 600.

## Colour

Follows `prefers-color-scheme`. Restrained: neutrals carry everything, orange marks the
active note, list bullets, links, caret, selection and focus only.

| token        | light     | dark      |
|--------------|-----------|-----------|
| `--bg`       | `#fdfcfa` | `#1c1b19` |
| `--chrome`   | `#efede7` | `#141311` |
| `--surface` (menus, mind map nodes) | `#ffffff` | `#25231f` |
| `--line`     | `#e3e0d8` | `#36332d` |
| `--text`     | `#1d1c26` | `#ece8e1` |
| `--muted`    | `#67647a` | `#a29b90` |
| `--accent`   | `#f7941d` | `#f7941d` |
| `--accent-text` (links, AA on bg) | `#a85a00` | `#ffad4d` |
| `--code-string` (JSON/YAML strings) | `#2f7d4f` | `#8fd4a4` |
| `--code-number` (JSON/YAML numbers) | `#6a4fc4` | `#b8a6ff` |

## Components

- One note open at a time. Title bar 40px on `--chrome`: the open note's title, the
  `…` menu and the window buttons; bare space drags the window.
- Left rail 44px on `--chrome`: new note, new mind map, find; then notes list toggle
  (2px accent bar when open), trash, settings.
- Notes list 248px on `--bg`: a Pinned group first, then Today / Yesterday / Earlier by local calendar day;
  row = kind icon, title, lock mark if locked, relative time; on hover or focus, pin / lock /
  trash buttons (22px, muted) replace the time; the open note takes
  `--surface` and a 2px accent left bar. Renders at most 200 rows. Hidden state is kept;
  starts hidden under 1100px.
- Dark is warm graphite, not blue, so the orange accent reads as the only colour.
- Quick switcher: native `<dialog>` near the top, one input, result list, keyboard and
  mouse.
- Icons: inline SVG, 16px, 1.5px stroke, `currentColor`.
- Motion: 120–180 ms ease-out on hover and state changes only.
