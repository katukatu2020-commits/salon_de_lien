import fs from 'node:fs'

const ledger = fs.readFileSync('/app/sales-ledger-client-v318.js', 'utf8')
const workflows = fs.readFileSync('/app/ui-workflows-v294.js', 'utf8')

for (const marker of [
  'sales-ledger-layout-v388',
  'data-sl-ledger-portal',
  'cleanupLedgerPortal',
  'max-width:80rem;margin:0 auto;gap:24px',
  'grid w-full grid-cols-3 gap-1 rounded-[18px]',
  'lien-glass overflow-hidden rounded-[28px]',
]) {
  if (!ledger.includes(marker)) throw new Error(`sales ledger marker missing: ${marker}`)
}
if (ledger.includes('main.innerHTML = ledgerMarkup()')) throw new Error('sales ledger still replaces the React-managed main element')

for (const marker of [
  'data-lien-customer-chat-portal',
  'cleanupCustomerChatPortal',
  "if (location.pathname !== '/u/chat') cleanupCustomerChatPortal()",
  "panel.hidden = true",
]) {
  if (!workflows.includes(marker)) throw new Error(`navigation safety marker missing: ${marker}`)
}
if (workflows.includes('main.innerHTML = `<section class="lien-chat-v294"')) throw new Error('customer chat still replaces the React-managed main element')
if (workflows.includes("document.querySelector('[aria-label=\"SMS認証・同意状況\"]')?.remove()")) throw new Error('React-managed SMS panel is still removed directly')

new Function(ledger)
new Function(workflows)
console.log('sales ledger layout and navigation v388 verified')
