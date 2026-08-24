# Settings dialog readiness v435

Immutable runtime child patch for the production image recorded by release v434.

It fixes the intermittent blank checkout/inventory settings dialog by:

- retrying embedded settings initialization until the requested form exists;
- exposing the idempotent initializer to its same-origin parent dialog; and
- letting the parent polling loop request initialization before revealing the iframe.

The patch does not change settings values, form actions, customer navigation, or database behavior.
