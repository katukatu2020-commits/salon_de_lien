# Campaign admin layout v457

This protected runtime patch aligns the campaign workspace with the existing
customer, chat, and delivery admin pages.

- Locks the parent to the reviewed ECS v456 image digest.
- Changes only `/app/customer-campaigns-v427.js`.
- Uses the shared 1152px workspace width, tab geometry, typography, card
  spacing, and icon semantics.
- Preserves campaign creation, editing, deletion, image upload, and APIs.
- Does not change database models or customer-facing pages.
