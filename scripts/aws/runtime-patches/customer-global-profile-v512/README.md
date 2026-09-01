# Customer global profile v512

- Keeps one canonical customer identity across every linked salon while preserving store-specific histories, notes, assignments, points, coupons, and chats.
- Reconciles existing linked profiles from the active app account's canonical customer record at startup.
- Synchronizes customer and staff profile edits, hair-profile edits, profile images, store linking, and code-based bookings.
- Reserves `C-R-*` for real app accounts and gives provisional store-only charts a separate `C-T-*` namespace, preventing unrelated customers from appearing to share a code.
- Audits all active app accounts and explicitly verifies that the real `C-R-037` account has no cross-store profile drift before deployment.
