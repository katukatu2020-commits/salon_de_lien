# Customer booking transition v524

Prevents the customer booking page from exposing its native, pre-enhancement layout while the commercial menu picker and staff presentation are being prepared.

- Installs a head-time customer shell gate that remains armed across cold loads, SPA navigation, history navigation, and bfcache restores.
- Reuses the existing `data-orimia-ui-ready="v516"` runtime contract as the reveal signal.
- Keeps the interim application DOM hidden behind the standard ORIMIA loading treatment.
- Adds a mobile browser regression that records every interim booking state and rejects any visible native menu selector.
