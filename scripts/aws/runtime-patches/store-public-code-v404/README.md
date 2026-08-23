# Store public code v404

New organizations already receive a unique `Organization.publicCode` in the
registration transaction. This narrow production patch changes only the
post-registration destination so the owner lands on the settings screen where
that code and its QR are shown first.

The patch is based on the exact v403 production image digest. It preserves the
payment onboarding guard: after the owner has seen the code, other protected
navigation continues to require completion of billing setup.
