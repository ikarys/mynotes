# Design

Operate surface: a quiet Windows tool. The brand appears in precise details (accent,
caret, selection, focus), never as decoration.

## Type

Segoe UI Variable (the Windows system face), one family. UI 13px; editor body 15px /
1.6, full window width (the maintainer wants the whole window to write in); headings 1.6 / 1.3 / 1.1 rem, weight 600.

## Colour

Follows `prefers-color-scheme`. Restrained: neutrals carry everything, orange marks the
active tab, links, caret, selection and focus only.

| token        | light     | dark      |
|--------------|-----------|-----------|
| `--bg`       | `#fbfaf7` | `#14152a` |
| `--chrome`   | `#f0eee8` | `#0f1020` |
| `--line`     | `#e2dfd6` | `#262842` |
| `--text`     | `#1d1c26` | `#e9e7f2` |
| `--muted`    | `#6b6878` | `#9a98ae` |
| `--accent`   | `#f7941d` | `#f7941d` |
| `--accent-text` (links, AA on bg) | `#a85a00` | `#ffad4d` |

## Components

- Tab bar 36px on `--chrome`; active tab takes `--bg` and a 2px accent top edge; close
  button appears on hover and on the active tab; middle click closes; double click on
  empty bar space creates a note.
- Quick switcher: native `<dialog>` near the top, one input, result list, keyboard and
  mouse.
- Icons: inline SVG, 16px, 1.5px stroke, `currentColor`.
- Motion: 120–180 ms ease-out on hover and state changes only.
