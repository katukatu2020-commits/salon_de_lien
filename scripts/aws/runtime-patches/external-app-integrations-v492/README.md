# External app integrations v492

This protected child release reorganizes the store operations settings page.

- Renames the former LINE reservation tab to `外部アプリ連携`.
- Places the existing LINE Messaging API and LIFF settings in the integrations page.
- Removes the Hotpepper inbound-email field from the store basics view.
- Shows the same tenant-scoped inbound address in a dedicated Hotpepper integration card.
- Supports copying an issued address, retrying failed loads, and issuing an address for a new store.
- Preserves existing LINE secrets, webhook configuration, and inbound reservation processing.
