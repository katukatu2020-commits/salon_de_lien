# Dealer form origin v554

Fixes legitimate dealer authentication form submissions that omit `Origin` and `Referer`, as observed in mobile Safari.

- Explicit `Origin` or `Referer` values continue to require an exact trusted-origin match.
- When both headers are absent or `Origin` is `null`, only the browser-controlled `Sec-Fetch-Site: same-origin` fallback is accepted.
- Missing metadata, cross-site requests, same-site subdomains, and explicit foreign origins remain rejected.
- Registration, login, and password-reset form paths share the corrected policy.
