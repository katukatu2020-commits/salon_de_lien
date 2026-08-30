# Customer login email v473

This protected child-image patch allows customer authentication with either the
account login ID or its registered email address.

- Both identifiers are matched case-insensitively within CUSTOMER accounts.
- The signed session continues to use the account's canonical login ID, with
  the registered email as a legacy fallback.
- Failed email input is not echoed into redirect query strings.
- Backoffice authentication and all existing customer/store data are unchanged.
