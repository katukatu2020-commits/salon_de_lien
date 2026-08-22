# Customer current reservation cancellation v374

Renames the customer appointments client chunk so browsers cannot reuse the
older immutable cache entry that omitted `data-customer-appointment-id`. This
ensures the v373 cancellation action can bind after both reload and client-side
navigation.
