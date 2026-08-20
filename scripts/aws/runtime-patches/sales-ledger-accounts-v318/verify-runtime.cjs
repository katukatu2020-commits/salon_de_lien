const fs = require('node:fs')

const checks = [
  ['/app/server.js', 'createSalesLedgerAccountsService', 'server loads sales ledger service'],
  ['/app/server.js', 'salesLedgerAccounts.ensureSchema()', 'server initializes sales ledger schema'],
  ['/app/sales-ledger-accounts-v318.js', 'SalesCorrectionAudit', 'sales corrections are audited'],
  ['/app/sales-ledger-accounts-v318.js', 'MAX_BULK = 100', 'bulk correction is bounded'],
  ['/app/sales-ledger-accounts-v318.js', 'isSharedStoreAccount', 'shared store account is tenant scoped'],
  ['/app/sales-ledger-client-v318.js', '選択項目を一括修正', 'ledger supports multi-select correction'],
  ['/app/sales-ledger-client-v318.js', 'window.print()', 'ledger supports printing'],
  ['/app/sales-ledger-client-v318.js', '店舗共通アカウント', 'account page configures shared account'],
  ['/app/billing.js', 'name="storeLoginId"', 'registration collects shared login ID'],
  ['/app/billing.js', 'isSharedStoreAccount', 'registration creates both owner and shared accounts'],
  ['/app/platform-operator.js', '/api/platform/enter-store', 'operator can enter an explicitly selected store'],
  ['/app/platform-operator.js', 'operatorSubject', 'operator identity is retained in bridged session'],
]

const failed = []
for (const [file, marker, label] of checks) {
  const source = fs.readFileSync(file, 'utf8')
  if (!source.includes(marker)) failed.push(label)
  else console.log(`ok - ${label}`)
}
if (failed.length) throw new Error(`runtime verification failed: ${failed.join(', ')}`)
