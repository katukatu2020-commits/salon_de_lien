# Customer record merge v385

Adds a safe, manually confirmed customer-record merge flow to the store-side customer chart.

- The currently open customer record is retained.
- A second active customer in the same organization is selected by name, phone, email, login ID, or customer ID.
- Appointments, visits, sales, points, coupons, broadcasts, proposals, photos, SMS logs, and chat history move to the retained customer.
- One-to-one profiles fill only missing values on the retained customer.
- If only the duplicate has a customer login, that account is transferred. If both have logins, the retained customer's login remains and the duplicate login is disabled.
- The duplicate is hidden from the store after merge instead of being physically deleted.
- Every merge is transactionally locked, same-origin protected, confirmation-name protected, and audited in `CustomerMergeHistory`.
- `integration-test.mjs` exercises point, appointment, accounting, chat, audit and source-visibility migration against a disposable pair of local customer records.

Build verification checks syntax and all security/data-preservation markers before an image can be produced.
