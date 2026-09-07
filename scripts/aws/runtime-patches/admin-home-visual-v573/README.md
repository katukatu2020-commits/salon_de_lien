# Admin home visual v573

This protected child release makes the salon's customer-home image the single source for decorative store imagery in the authenticated salon application.

- Loads the organization-scoped image through the existing staff branding API.
- Applies it to the shared sidebar and admin page-header visuals, including inventory ordering.
- Keeps logos, QR codes, product photos, chart files, customer uploads, and style-post photos unchanged.
- Updates newly mounted SPA content and reacts immediately when the home-display image is saved or reset.
- Falls back to the standard salon interior image when no custom image exists or the private image cannot load.
