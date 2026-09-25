# Chat and campaign time v664

- Lets the salon shared-store account send and manage replies in every customer chat while retaining assigned-staff restrictions for ordinary staff accounts.
- Treats campaign `datetime-local` values as Japan Standard Time on create and update.
- Migrates legacy campaign timestamps once, using `timeZoneVersion` to prevent repeat correction and to catch writes from an older task during a rolling deployment.
- Formats campaign edit fields in Japan Standard Time regardless of server or browser timezone.
