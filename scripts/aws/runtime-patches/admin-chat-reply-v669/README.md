# Admin Chat Reply v669

Reviewed parent: customer-store-frequency-v668,
`sha256:5abb783653677b4884c140356322a40b54d134ca374c4a844ec70fe0bbf8a105`.

## Cause

The recovered Next page renders the selected `threadId` into the reply form,
but a later client hydration pass can replace that hidden field with an empty
one. The form then posts a message without a conversation identifier and the
server redirects without storing it.

## Fix

- Keep the hidden reply context synchronized with the selected URL before form
  submission, including after React replaces the form.
- Recover a missing thread or customer context from a same-host, chat-route
  referrer on the server.
- Retain organization and staff-access validation before any message insert.
- Verify both the browser path and server fallback with temporary demo messages
  that are deleted immediately after the test.
