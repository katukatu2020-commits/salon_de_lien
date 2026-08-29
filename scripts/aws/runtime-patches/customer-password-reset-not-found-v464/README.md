# Customer password-reset not-found v464

This protected child-image patch changes only the customer password-reset request flow.

- Active customer credentials are accepted only when the related customer record is not withdrawn.
- Unregistered, invalid, or withdrawn customer emails return an explicit Japanese error.
- No reset token or email is created for those addresses.
- The admin reset flow keeps its existing generic response to avoid changing staff account enumeration behavior.

The Docker build fails unless the reviewed v463 runtime contains each expected legacy block exactly once.
