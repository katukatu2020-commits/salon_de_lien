# Dealer company and billing v584

This protected runtime release adds company management and Stripe subscription access control to ORIMIA Partner.

- Adds a dealer-only company and office profile for legal name, representative, invoice registration number, contact details, address, website, and business hours.
- Adds a shared-layout billing page with Stripe Checkout, Billing Portal, trial, card summary, and subscription state.
- Requires an active, trialing, or past-due dealer subscription before orders, salons, products, pricing, and delivery notes can be used.
- Keeps company details and billing available before payment so a new dealer can complete setup.
- Routes dealer subscriptions through the existing signed Stripe webhook while preserving salon subscription processing.
- Uses `STRIPE_PRICE_DEALER` when configured and falls back to the existing 9,800-yen `STRIPE_PRICE_TAKE` price.
