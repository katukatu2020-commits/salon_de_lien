# Commercial transactional email v419

This immutable child-image patch is based on the exact ECS task 418 image.

- Rewrites customer registration, password reset, and withdrawal confirmation emails with a consistent commercial-quality HTML and plain-text structure.
- Keeps Postmark, token generation, expiration, database records, and request routing unchanged.
- Adds an explicit action, expiry, fallback URL, and security guidance to every email.
- Does not send test email, expose tokens, or change customer data.
