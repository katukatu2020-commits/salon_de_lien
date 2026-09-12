# Customer profile name fields v636

Updates the customer app profile editor to use the same four required name fields as registration:

- surname and given name
- surname and given-name furigana
- safe prefill for legacy single-field customer names
- shared katakana normalization and validation
- transactional persistence of the display name and structured fields
- the priority compatibility handler uses the same four-field contract for every linked customer record
- compatibility with the existing optional nickname editor

The production audit is read-only. Invalid HTTP verification requests are rejected before any database write.
