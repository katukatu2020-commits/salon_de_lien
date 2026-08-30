# Product catalog submit v494

This protected child release repairs the unresponsive product creation flow in the staff product catalog.

- Stops the notification panel from rewriting identical markup and retriggering its own global mutation observer.
- Updates notification badge text only when the visible count changes.
- Captures the product registration button before the React server-action fallback can consume the click.
- Preserves browser validation and sends the form to the tenant-scoped catalog API.
- Shows a busy state while saving and restores the button with an error toast when registration fails.
- Does not change existing products, prices, stock, menus, or store settings.
