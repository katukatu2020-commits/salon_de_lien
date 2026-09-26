# Contract Partner Chat v682

Protected child release of v681. No production fixture or destructive migration.

- `/dealer/messages`: contracted salons in a searchable, paginated two-pane chat; staff see only assigned salons.
- `/admin/dealer-messages?dealer=...`: linked dealers in the same chat layout, with the requested dealer open.
- Salon inventory/orders: explicit `チャットを開く` action on every linked dealer.
- Active contracts and active dealer accounts are required on every history/send/read request.
- Existing salon threads are shown chronologically together, retaining order numbers and subjects. Internal threads are not included or deleted.
- First-message thread creation is serialized by the existing dealer command lock; send retries reuse idempotency keys.
- Read cursors never consume messages arriving after the displayed cursor. Replies by coworkers on the same side do not count as incoming unread messages.
- Partner lists use 30-item pages; messages use 50-item cursors. Polling does not replace the composer or reset scroll. Drafts remain in memory per partner and are not persisted on a shared computer.
- Dedicated versioned assets preserve the previous immutable assets and the salon hydration gate from v680.

Verification: `verify-runtime.mjs`, `integration.mjs`, `browser-regression.mjs` (isolated loopback fixture only), and read-only `production-smoke.mjs`. Browser coverage includes 1440px, 390px, 320px, two-way sending, Japanese IME, drafts, history, response-loss retry and out-of-order responses. Existing ERP/stock-note tests run with the chat integration suite.
