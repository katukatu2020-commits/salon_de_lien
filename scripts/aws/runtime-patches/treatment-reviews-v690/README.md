# Treatment Reviews v690

Parent: protected v689, digest `sha256:ce5a47ea54b695fd5a335271bf206577d6242c336446b648c9f7e8c3a4b271a8`.

## Behavior

- `/u/reviews` contains paginated treatment and existing product surveys. Existing product survey detail/submission and reward lottery are unchanged.
- Paid, non-cancelled, past appointments become treatment review invitations without buying a product. Prior paid appointments are also eligible. Staff is resolved from the recorded treatment staff, never the current assigned sales person or a first-staff fallback. Unknown/ambiguous historical staff requires salon correction.
- `/u/staff` lists active bookable staff using existing profiles/photos; each staff detail shows all ratings equally, newest first, paginated. No automatic publication of old private feedback.
- Explicit publication consent is required. Public identity is the author's current nickname, falling back to anonymous. Names, email, appointment IDs of other reviewers and visit dates are not exposed.
- The home campaign quick link becomes Staff Introduction. Campaign pages and home announcements remain; desktop navigation and native asset versions are updated.
- Customers can edit/delete their own review. Optimistic versions reject stale edits. Deletion removes text/rating from public view, retains only the reward claim and review identity, and does not deduct points. Reposting/editing does not award again.

## Points and Storage

Uses the existing `feedback_submitted` rule (default 30 points / 40 days), honoring its active flag. The rule is currently platform-wide in the existing schema, not newly tenant-scoped. Existing checkout points are unchanged. A point transaction, expiring lot and account balance increment are written atomically with the first review. The existing `feedback` / `service-sale:<id>` source is retained for points history and legacy compatibility.

New `TreatmentReview` table is additive with foreign-key cleanup and customer/staff indexes. Appointment locks serialize review saves and legacy feedback; account locks serialize point balances across visits. All sales on one appointment are checked for already-rewarded feedback. An inactive reward rule is not retroactively claimed by later edits.

Reads/writes require a validated current customer/store session. Writes require a same-origin request, bounded JSON and publication consent. Withdrawn/hidden customers and voided/cancelled visits are excluded from public reviews. Other customers cannot edit/delete; the staff key is derived server-side. No production sample reviews are created.

## Verification

- `verify-runtime.mjs`: syntax/patch anchors, legacy guard, prior release assets.
- `integration.mjs`: disposable PostgreSQL schema, concurrency, balances/lots/expiry, authorization, CSRF, low/high ratings, XSS, edit/delete/repost, legacy rewards, inactive rules, product surveys, void/withdrawal visibility.
- `full-app-regression.mjs`: strictly isolated v680 local DB/app; actual browser at 1440/390/320 widths, input, failed-save recovery, review lifecycle, points history, staff matching and navigation. QA-prefixed fixtures are local only.
- Protected GitHub workflow runs runtime/integration checks and previous chat/order/hydration regressions before deploying, then read-only production smoke. Direct local AWS deployment is prohibited.

Local QA URL: `http://127.0.0.1:3188`.
