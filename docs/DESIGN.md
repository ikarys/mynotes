# Landing page design

The page is a mynotes window. The notes list on the left holds the site's sections as notes, grouped by day like the app. The open note on the right renders like the editor. The search box in the title bar filters the list.

- Desk: burnt orange `#b4530c`, white footer text on it (5.0:1).
- Window: the app's own light tokens (`src/app.css`): chrome `#efede7`, background `#fdfcfa`, accent `#f7941d` with dark ink text, `#a85a00` for accent text.
- Type: Hanken Grotesk only, self-hosted. The welcome note's title is the one large headline.
- Fennec: perched on the window's top edge, the only illustration.
- Motion: one demo on arrival: "lis" is typed into the search, and the list narrows to "Weekend trip to Lisbon". It is skipped with reduced motion, on a deep link, and on small screens.
- Without JS, every note is shown in order, and the search and list toggle are hidden.
- Small screens: no rail, and the list opens as an overlay from the title bar button.
- Avoid: marketing sections, eyebrow labels, cards, gradients, a second display face.
