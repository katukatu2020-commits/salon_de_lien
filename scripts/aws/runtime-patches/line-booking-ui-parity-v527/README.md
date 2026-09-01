# LINE booking UI parity v527

- Replaces the standalone legacy LIFF booking layout with the current ORIMIA customer booking design.
- Keeps LIFF authentication and the existing LINE booking, history, and cancellation APIs.
- Adds the searchable selected-menu card, stylist selector, weekly availability grid, confirmation summary, and customer-app navigation shell.
- Exposes store opening and closing minutes already used by availability so the weekly grid follows each tenant's operating hours.
- Loads a full week through one authenticated availability request, avoiding seven LIFF requests for every selection change.

Validation:

```powershell
node --check scripts/aws/runtime-patches/line-booking-ui-parity-v527/line-booking-page-v527.js
node scripts/aws/runtime-patches/line-booking-ui-parity-v527/test-page.mjs
node scripts/aws/runtime-patches/line-booking-ui-parity-v527/browser-regression.mjs
```
