# Store public code v402

> Superseded by v403. This revision briefly duplicated the existing store
> identity section and must not be used for a new deployment.

This immutable runtime patch is based on the exact production v401 digest.

- Persists a unique store code in the same transaction as store registration.
- Self-heals a missing code when the authenticated store QR endpoint is opened.
- Shows the store code, QR code, and copy action on the owner settings page.
- Preserves every prior v401 runtime change.
