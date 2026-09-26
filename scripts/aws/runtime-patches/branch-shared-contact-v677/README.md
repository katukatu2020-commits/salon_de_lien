# Branch shared contact v677

Parent: protected v676, digest `sha256:a5c6d10d40f4b9cb1a0a4430c53d9b0e6596a7bcb5581f49b10417d23b238f58`.

The approval service treated the notification address as a globally unique
business login identity. Legitimate branch inquiries therefore failed when
the owner reused the parent store's email address.

Only server-recorded SalonBranchInquiry requests qualify. Revalidate the active
group owner and source membership before resolving the contact. Existing business
contacts may be reused only when every matching account belongs to that group.
Ordinary salon/dealer applications, foreign groups and dealer address collisions
remain rejected; the existing global login-ID check remains intact.

New branch principals receive a unique internal authentication email in the
reserved `.invalid` namespace derived from their independently issued login ID.
The real email remains in BusinessInquiry, ManagedAccountIssue and
ManagedBusinessAccess.contactEmail, which approval/reissue notifications and the
operator account listing already use. Login uses the issued ID. Database email
uniqueness and existing users/passwords are not changed. Store phone numbers remain
the submitted contact numbers, including shared branch numbers.

Existing pending branch inquiries can be retried without migration/resubmission.
This release does not approve any production request or send production email.

Verification: isolated PostgreSQL schema, also tested with copies of the local
application table definitions/indexes. Tests cover shared owner email/phone,
case normalization, independent credentials, delivery destination, unchanged
parent credentials, ordinary/foreign/dealer duplicate rejection, contact-only
duplicate detection, concurrent branches, repeated approval, pending retry,
duplicate login ID, revoked ownership, audience tampering, initial password gate,
mail failure/reissue UI and existing group-master regression. Fixture mail is
captured in memory, never sent externally. No schema migration is required.
