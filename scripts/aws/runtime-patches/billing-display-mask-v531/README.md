# Billing display mask v531

Temporarily masks every numeric yen amount rendered inside the owner-facing system billing page as `*****円` while pricing is not finalized.

The mask is applied to both the commercial Next.js billing view and its two legacy billing render paths. Billing calculations, Stripe values, plan configuration, SMS counts, dates, and saved data remain unchanged.
