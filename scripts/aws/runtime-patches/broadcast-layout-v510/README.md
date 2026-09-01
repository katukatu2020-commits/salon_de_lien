# Broadcast layout v510

This runtime patch expands the customer broadcast wizard to the full admin content width. On wide screens, steps 1 and 2 share a balanced two-column row, while step 3 spans the full width. The collapsed coupon step is rendered as a compact horizontal row and expands only when enabled. Tablet and mobile layouts remain a clear single-column flow.

The patch changes presentation and coupon-field visibility only. It does not submit or send a broadcast during verification.
