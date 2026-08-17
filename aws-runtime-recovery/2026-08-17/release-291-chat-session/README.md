# Release 291: chat session compatibility

This protected runtime patch is based on ECS task definition 290.

It fixes the admin chat API for the configured fallback administrator account.
That signed session intentionally has no `userId`, so the runtime now resolves the
same active account by `subject` within the signed `organizationId` boundary.

The patch does not change application routes, schemas, customer data, or any
unrelated frontend implementation.
