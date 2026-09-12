# Salon onboarding guide removal v632

Production child-image patch that removes first-use guidance from the salon app.

## Behavior

- Removes the automatic first-store product tour after account registration.
- Clears saved tour state so paused tours do not return.
- Removes the automatic setup wizard and its persistent launcher.
- Removes staff, menu, and reservation-email setup progress from Store Settings.
- Keeps the underlying staff, menu, store profile, owner email, and inbound-email features available from their normal pages.

## Verification

- Exact-parent runtime patch assertions for the three changed files.
- Browser regression at mobile and desktop widths with an incomplete new-store fixture.
- Production readiness, asset, and unauthenticated-route smoke checks.
