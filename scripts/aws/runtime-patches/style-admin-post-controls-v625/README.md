# Style admin post controls v625

Restores store-side publication and deletion controls after the v618 style list replaced the legacy grid.

- Includes both published and private posts in the staff management list.
- Adds a publication toggle and delete action to every style card.
- Keeps private posts out of their unavailable detail route until they are published again.
- Restores the same management actions on an available staff detail page.
- Requires explicit confirmation before deletion.
- Refreshes the list in place, without the full-page navigation loader.
- Leaves customer-facing style queries restricted to published posts.
- Uses an explicit script boundary so the controls execute after the existing list client.
- Reuses the existing management controls on the detail page instead of duplicating them.
