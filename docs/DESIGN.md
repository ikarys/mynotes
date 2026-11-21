# Site design

The landing page in `docs/` (Jekyll on GitHub Pages). Not part of the app.

- Palette: ground `#f6efe3`, raised `#fffaf2`, hairlines `#e4d8c4`, text `#2b1d12`, muted `#68543f`, orange `#f7941d` for the download control, rust `#a3480a` for links and accents, highlight `#ffd9a8`. Every text pair is at least 4.5:1.
- Type: Fredoka for headings, controls and figures; Hanken Grotesk for body. Both self-hosted woff2 in `assets/fonts` with their OFL licences.
- Hero: the fennec holding the quick switcher. The HTML carries the final filtered state; the script in `_layouts/default.html` replays the typing. It is the page's only animation.
- Numbers: plain figures, each with what was measured; the method note and `VERIFICATION.md` link stay under them.
- Avoid: eyebrow labels, card grids, gradient text, glass, dark-only themes, motion beyond the hero.
