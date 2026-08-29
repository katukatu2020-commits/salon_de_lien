# Customer registration email display v454

This protected child-image patch fixes the store-side customer chart showing
`登録メールアドレス: 未登録` after a successful customer registration.

The registration flow already persists the verified address. The running
Prisma client returns the filtered `Customer.appUsers` include as an array, but
runtime patch v352 changed the customer chart to singular-property access. This
release restores array access for both the email field and registration-state
check. It does not mutate customer or authentication data.
