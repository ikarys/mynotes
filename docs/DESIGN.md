# Landing page design

The page is a website about a desktop app, and says so first. It leads with what mynotes does well; each claim comes with its proof: a screenshot, a measured figure or a fact.

- Hero: a burnt orange band (`#b4530c`, the fennec's colour) holding the brand, the one large headline, the sub, Download and the fennec. White text on it is 5.0:1.
- A real app screenshot overlaps the bottom edge of the band, so the product shows before any scrolling.
- Strengths: one row each, separated by a hairline. The claim heading sits on the left and the body and proof on the right, the same way in every row (rows do not alternate).
- Body colours are the app's own light tokens (`src/app.css`): background `#fdfcfa`, line `#e3e0d8`, muted `#67647a`, accent `#f7941d`, `#a85a00` for accent text.
- Type: Hanken Grotesk only, self-hosted. Large, tight headings (800 for the hero, 750 for the rows); the figures use the same face.
- Fennec: in the hero only; the only illustration.
- No JavaScript, no motion. Screenshots below the hero load lazily.
- Small screens: one column, and the fennec moves to the top right corner of the band.
- Avoid: an app imitation or a demo (visitors could not tell the site from an online tool), eyebrow labels, cards, gradients, alternating left/right blocks, a second display face.
