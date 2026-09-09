# Stamp Program v603

Adds one store-scoped stamp card program shared by the salon settings screen and customer app.

## Behavior

- Owners configure the number of visits required for a reward from `店舗運用設定 > 会計・ポイント`.
- Rewards can be a free catalog product, free salon menu, percentage discount, fixed discount, or custom benefit.
- Customer stamp progress uses all completed `Visit` records for the active store.
- The customer card is unified; hair and facial tabs are removed.
- The active store name and its configured reward are displayed on the card.

## Verification

```powershell
node --check stamp-program-v603.js
node --check stamp-program-v603-client.js
node integration.mjs
node browser-regression.mjs
```

The image is layered only on the locked v602 parent digest. Receipt POS v582 and daily sales print v590 are intentionally untouched.
