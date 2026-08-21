# Customer registration resend v345

- Adds a dedicated `メールを再送する` state to the customer registration email form.
- Keeps the submitted email and registration context in per-tab session storage.
- Disables resend for 60 seconds after each click and shows the remaining seconds.
- Enforces the same 60-second interval in the server-side registration endpoint so client-side bypasses cannot send mail repeatedly.
- Retains the existing 15-minute abuse limit and Postmark transactional delivery.
