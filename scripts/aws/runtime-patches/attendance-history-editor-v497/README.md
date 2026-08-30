# Attendance history editor v497

Fixes attendance records that remain open across midnight and adds a staff-by-staff monthly calendar with daily manual time correction.

## Behavior

- The clock screen prioritizes any open shift, even when its `workDate` is before today.
- Clock-out continues to close the newest open shift without a date restriction.
- Manual corrections validate tenant ownership, staff ownership, interval order, future times, duration, and overlapping records.
- Manual edits store editor and timestamp audit fields.
- Product image upload behavior from the existing attendance client tail is preserved byte-for-byte.

## Verification

```powershell
docker build --build-arg BASE_IMAGE=salon-de-lien:customer-registration-filter-v496-local `
  -t salon-de-lien:attendance-history-editor-v497-local `
  scripts/aws/runtime-patches/attendance-history-editor-v497
```
