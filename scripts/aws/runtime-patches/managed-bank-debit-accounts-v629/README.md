# Managed bank-debit accounts v629

Production child-image patch for managed business onboarding.

- Removes public salon and dealer self-registration.
- Removes new Stripe card checkout, webhook updates, and billing navigation.
- Migrates every salon and dealer billing record to operator-managed bank debit.
- Cancels reviewed Stripe test subscriptions before removing stored card references.
- Adds salon and dealer account issuance to `/platform/accounts`.
- Labels business login credentials as operator-issued IDs.
- Cancels the reviewed test-mode subscriptions and removes stored card references after deployment.

The image is built only from the reviewed production parent digest and verified before deployment.
