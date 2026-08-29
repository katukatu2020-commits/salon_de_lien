# Style community card controls v470

Protected child-image patch on top of the approved v469 release.

- Uses the existing style image grid as the only staff management list.
- Places an accessible public/private toggle and delete button below every image.
- Keeps private posts in that same image grid so they can be published again.
- Resolves private image references only through the authenticated, tenant-scoped staff API.
- Deletes the community post, likes, and comments without deleting visit history or source photos.
- Shows explicit edit/delete controls on comments owned by the logged-in user.
- Preserves the v469 detail, comment, chat, tenant, and session controls.
