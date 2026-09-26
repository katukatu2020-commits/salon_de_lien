# Optional inventory notes v681

Parent: v680, `sha256:cb5aab2bd28b5628f9ee7450cdf253822948e9eea40be0a18b307f57b1fc0eac`.

The stock movement dialog uses `備考（任意）` instead of a mandatory reason. Receipt, issue, count and transfer accept omitted, empty or whitespace notes. Notes remain limited to 1,000 characters and are retained in the existing stock-event field. The inventory history column is `備考`. No schema migration is needed.

Return, reversal, payment and order amendment reason requirements are unchanged. Quantity, tenant, role, allocation and concurrent-count checks are unchanged. The new client URL preserves the previous immutable asset.

Verification: focused API cases plus the complete inherited ERP regression, and desktop/mobile browser submissions with empty notes for receipt and issue. Production smoke is read-only.
