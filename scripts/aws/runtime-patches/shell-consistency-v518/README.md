# Shell consistency v518

Unifies the shared store and customer application shells.

- Expands the desktop store sidebar from 256px to 288px and keeps the content stage and collapse control aligned.
- Uses a stable mobile store header with back, brand, notifications, and menu controls.
- Restores a five-item mobile store bottom navigation matching the primary desktop navigation.
- Uses one customer header system across standalone and Next.js pages.
- Adds a customer back control on secondary routes while preserving menu and notification access.
- Uses `ORIMIA for Salon` in customer headers, metadata, and PWA manifests.
- Injects critical shell assets before protected-route content is revealed, avoiding legacy-layout flashes.
