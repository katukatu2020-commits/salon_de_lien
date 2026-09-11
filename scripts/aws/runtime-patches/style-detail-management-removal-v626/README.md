# Style detail management removal v626

Removes the legacy post-management block from store-side style details.

## Behavior

- Does not insert the `投稿管理` block on `/admin/community/:postId` style details.
- Removes a cached legacy block if an older client recreates it after rendering.
- Preserves style information, comment ownership controls, and customer detail behavior.
- Preserves the publish/unpublish and delete controls on the admin style list.

## Runtime scope

Only these runtime files are modified:

- `public/content-edit-delete-client-v615.js`
- `public/style-admin-controls-v618.js`
- `server.js`
