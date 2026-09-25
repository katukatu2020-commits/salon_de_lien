# Customer registration link recovery v660

Prevents the customer registration page from remaining behind the full-screen loader when the shared client layout bundle is delayed or fails to load in an email application's embedded browser.

- Applies only to `/u/register` and `/u/register/*`.
- Releases the loader as soon as the server-rendered registration or invalid-link content arrives.
- Includes a five-second fail-open timeout for interrupted streaming responses.
- Preserves the existing Postmark request timeout and registration token flow.
