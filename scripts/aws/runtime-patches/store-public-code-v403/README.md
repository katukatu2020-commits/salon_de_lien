# Store public code v403

This immutable runtime patch is based on the exact production v401 digest.

- Persists a unique store code in the same transaction as store registration.
- Self-heals a missing code when the authenticated store QR endpoint is opened.
- Keeps the existing store identity and QR section as the single display location.
- Preserves every prior v401 runtime change.
