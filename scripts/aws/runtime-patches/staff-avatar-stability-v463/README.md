# Staff avatar stability v463

This protected child release fixes the final header-avatar loading race found while verifying the v462 private-image release.

- It keeps the existing private S3 storage and same-origin image proxy.
- It explicitly selects the staff image audience in the admin header.
- It no longer appends a new timestamp on every DOM observer pass.
- It only assigns `img.src` when the resolved URL actually changes, preventing in-flight image requests from being aborted.

No database row, S3 object, campaign, or staff profile is modified by this patch.
