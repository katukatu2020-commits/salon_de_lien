# Customer withdrawal confirmation v339

Allows a customer to complete the email-confirmed withdrawal flow when the
confirmation form is opened in a mail application's privacy browser.

The destructive action remains protected by the opaque 256-bit token sent to
the customer's registered email address. The token is hashed at rest, expires,
and can be consumed only once. The authenticated endpoint that creates and
sends the token continues to require a valid same-origin customer session.
