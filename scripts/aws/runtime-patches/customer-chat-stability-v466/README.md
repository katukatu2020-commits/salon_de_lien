# Customer chat stability v466

Protected child-image patch on top of the approved v465 release.

- Replaces the document-wide chat mutation observer with an explicit render event.
- Keeps edit/delete controls in sync after customer chat rerenders.
- Uses a versioned client asset so existing immutable browser caches cannot retain v465.
- Preserves all v465 ownership and tenant checks.
