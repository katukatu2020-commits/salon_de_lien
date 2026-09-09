# Style system integration v602

This protected runtime release turns store style metadata into tenant-scoped ORIMIA references and makes the same structured information available to customers.

- Stores an optional `StaffBookingSetting.staffKey` and ordered `SalonMenu.id[]` on each store style post.
- Safely backfills exact, unambiguous staff and menu-name matches for existing posts.
- Replaces manual stylist and menu strings with ORIMIA staff and menu selectors while publishing or editing a style.
- Resolves the current staff profile, menu name, description, duration, and price for both store and customer views.
- Keeps imported metadata as a fallback when no ORIMIA record has been linked.
- Places the style name, stylist, and menu summary before the customer gallery and shows the full comment and menu details below it.
- Uses a three-photo primary/secondary mosaic on desktop and mobile, and removes duplicate attribution, caption panels, and internal publication-status labels from the customer detail UI.

The database and HTTP integration suite verifies exact-match backfill, ambiguous-match handling, tenant isolation, staff-only editing, customer projection, CSRF checks, payload limits, and inactive references. Browser regression covers 320 px, 390 px, and desktop layouts without changing unrelated booking, favorites, sales-printing, or receipt behavior.
