# Stylist auto coupon v330

The production image omitted the stylist selector and submitted the fixed text
`前回担当者`. The evaluator also issued stylist rules without comparing the saved
stylist to the customer's latest stylist.

This patch:

- loads active, non-leave stylists for the signed-in organization;
- shows and requires a stylist selector only for the stylist trigger;
- validates the selected stylist against the organization on the server;
- matches the customer's actual previous stylist before issuing a coupon;
- shows the saved stylist in the rule summary;
- applies the same missing equality guard to phone-last-digit rules.
