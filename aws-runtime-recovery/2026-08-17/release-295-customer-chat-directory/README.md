# Release 295: customer chat directory loader

This is a bounded child of the exact approved release-294 image.

It cache-busts the customer account layout asset and the customer messages
route asset so `/u/chat` reliably loads the already-audited
`ui-workflows-v294.js` helper, including when the old route asset is cached.
The staff directory uses a dedicated `section` instead of the customer shell's
globally hidden `aside`, so existing and new conversations remain selectable
on mobile as well as desktop.
On mobile, selecting a staff member switches to a full-width conversation view;
the conversation header provides a clear route back to the staff list. Desktop
keeps the two-pane layout.
The final mobile-flow assets use a fresh chunk name and helper query so Safari
cannot reuse the preceding directory-only release from cache.
The helper is still gated to `/u/chat`. No database, API, admin UI, or
unrelated customer behavior is modified.

The patch fails closed when any parent file hash or manifest reference differs.
