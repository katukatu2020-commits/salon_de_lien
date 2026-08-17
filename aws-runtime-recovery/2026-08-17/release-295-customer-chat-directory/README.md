# Release 295: customer chat directory loader

This is a bounded child of the exact approved release-294 image.

It cache-busts the customer account layout asset and the customer messages
route asset so `/u/chat` reliably loads the already-audited
`ui-workflows-v294.js` helper, including when the old route asset is cached.
The staff directory uses a dedicated `section` instead of the customer shell's
globally hidden `aside`, so existing and new conversations remain selectable
on mobile as well as desktop.
The helper is still gated to `/u/chat`. No database, API, admin UI, or
unrelated customer behavior is modified.

The patch fails closed when any parent file hash or manifest reference differs.
